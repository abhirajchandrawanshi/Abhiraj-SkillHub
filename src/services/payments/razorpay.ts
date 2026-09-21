import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";



const RAZORPAY_API = "https://api.razorpay.com/v1";

const customerSchema = z.object({
  courseId: z.string().optional(),
  courseIds: z.array(z.string()).optional(),
  bundlePrice: z.number().optional(), // Override price for bundle offers
  bundleOfferId: z.string().optional(),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  amount: z.number().optional(),
  title: z.string().optional(),
});

const paymentSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
  userId: z.string().optional(),
  isGuest: z.boolean().optional(),
});

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
};

type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  captured: boolean;
  email?: string;
  contact?: string;
};

function getRazorpayCredentials() {
  const keyId = process.env['RAZORPAY_KEY_ID']?.trim();
  const keySecret = process.env['RAZORPAY_KEY_SECRET']?.trim();
  
  console.log("Checking Razorpay credentials:", { 
    hasKeyId: !!keyId, 
    hasKeySecret: !!keySecret,
    keyIdLength: keyId?.length,
    keySecretLength: keySecret?.length
  });
  
  if (!keyId || !keySecret) {
    console.error("Missing Razorpay credentials");
    throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  return { keyId, keySecret };
}

function basicAuthHeader(keyId: string, keySecret: string) {
  const raw = `${keyId}:${keySecret}`;
  const encoded =
    typeof Buffer !== "undefined"
      ? Buffer.from(raw).toString("base64")
      : btoa(raw);
  return `Basic ${encoded}`;
}

// Initialize Firebase Admin SDK for server-side operations
function getAdminFirestore() {
  console.log("getAdminFirestore called, existing apps:", getApps().length);
  
  if (getApps().length > 0) {
    console.log("Returning existing Firestore instance");
    return getFirestore();
  }

  console.log("Initializing Firebase Admin SDK");
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  console.log("Environment check:", {
    hasPrivateKey: !!privateKey,
    hasProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
    hasClientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  });
  
  if (!privateKey || !process.env.FIREBASE_ADMIN_PROJECT_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
    console.error("Firebase Admin credentials not configured");
    throw new Error("Firebase Admin credentials not configured");
  }

  try {
    const app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      }),
    });

    console.log("Firebase Admin SDK initialized successfully");
    const db = getFirestore(app);
    try { db.settings({ preferRest: true }); } catch (e) { /* ignore if already set */ }
    return db;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    throw error;
  }
}

// Server-side course fetch using Admin SDK
async function getCourseByIdServer(courseId: string) {
  try {
    console.log("Fetching course from Firestore (server):", courseId);
    const db = getAdminFirestore();
    const docRef = db.collection("courses").doc(courseId);
    const snap = await docRef.get();

    console.log("Course exists:", snap.exists);
    
    if (!snap.exists) {
      console.error("Course not found in Firestore:", courseId);
      return null;
    }

    const courseData = {
      id: snap.id,
      ...snap.data(),
    } as any;
    console.log("Course data retrieved:", { id: courseData.id, title: courseData.title, price: courseData.price });
    return courseData;
  } catch (error) {
    console.error("Error fetching course from Firestore (server):", error);
    throw error;
  }
}

async function razorpayFetch(path: string, init: RequestInit) {
  const { keyId, keySecret } = getRazorpayCredentials();
  const response = await fetch(`${RAZORPAY_API}${path}`, {
    ...init,
    headers: {
      Authorization: basicAuthHeader(keyId, keySecret),
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { message: text };
  }

  if (!response.ok) {
    const description =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      payload.error &&
      typeof payload.error === "object" &&
      "description" in payload.error
        ? String((payload.error as { description?: unknown }).description)
        : `Razorpay request failed (${response.status}).`;
    throw new Error(description);
  }

  return payload;
}

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .validator(customerSchema)
  .handler(async ({ data }) => {
    try {
      // Resolve course IDs — support both single courseId and courseIds[]
      const courseIds: string[] = data.courseIds?.length
        ? data.courseIds
        : data.courseId
          ? [data.courseId]
          : [];

      if (courseIds.length === 0) {
        throw new Error("No course ID(s) provided");
      }

      console.log("Creating Razorpay order for:", { courseIds, name: data.name, email: data.email });
      
      const { keyId } = getRazorpayCredentials();
      
      let amountPaise: number = 0;
      let courseTitle: string = "";
      
      if (data.bundlePrice && data.bundlePrice > 0) {
        // Bundle offer price override
        amountPaise = data.bundlePrice * 100;
        courseTitle = courseIds.length > 1 ? `Bundle (${courseIds.length} courses)` : (courseIds[0] || "Course");
        console.log("Using bundle price:", amountPaise);
      } else {
        // Fetch all courses and sum prices
        try {
          const courseResults = await Promise.all(
            courseIds.map((id) => getCourseByIdServer(id))
          );
          
          const courses = courseResults.filter(Boolean);
          if (courses.length === 0) {
            throw new Error(`No courses found for IDs: ${courseIds.join(", ")}`);
          }
          
          for (const course of courses) {
            if (!course.price || !course.title) {
              throw new Error(`Course data incomplete for: ${course.id}`);
            }
          }

          const totalPrice = courses.reduce((sum: number, c: any) => sum + c.price, 0);
          amountPaise = totalPrice * 100;
          courseTitle = courses.length === 1
            ? courses[0].title
            : `${courses.map((c: any) => c.title).join(" + ")}`;
          console.log("Summed course prices:", { totalPrice, courseTitle });
        } catch (error) {
          console.error("Error fetching courses:", error);
          throw new Error(`Invalid course ID(s). Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      console.log("Order details:", { amountPaise, courseTitle, currency: "INR" });

      const primaryCourseId = courseIds[0];
      const order = (await razorpayFetch("/orders", {
        method: "POST",
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: `${primaryCourseId}_${Date.now()}`.slice(0, 40),
          notes: {
            courseIds: courseIds.join(","),
            courseTitle: courseTitle,
            customerName: data.name,
            customerEmail: data.email,
            bundleOfferId: data.bundleOfferId || "",
          },
        }),
      })) as RazorpayOrder;

      console.log("Razorpay order created:", { orderId: order.id, amount: order.amount, currency: order.currency });

      if (!order?.id) {
        throw new Error("Razorpay did not return an order id.");
      }

      return {
        keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      };
    } catch (error) {
      console.error("Error creating Razorpay order:", error);
      throw error;
    }
  });

export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .validator(paymentSchema)
  .handler(async ({ data }) => {
    const { keySecret } = getRazorpayCredentials();

    console.log("Verifying payment:", { orderId: data.orderId, paymentId: data.paymentId });

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(keySecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${data.orderId}|${data.paymentId}`),
    );
    const expectedSignature = Array.from(new Uint8Array(signature), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");

    console.log("Signature verification:", { 
      expected: expectedSignature.substring(0, 10) + "...", 
      received: data.signature.substring(0, 10) + "..." 
    });

    if (expectedSignature !== data.signature) {
      console.error("Signature mismatch:", { expected: expectedSignature, received: data.signature });
      throw new Error("Payment signature verification failed. Please contact support.");
    }

    const payment = (await razorpayFetch(`/payments/${encodeURIComponent(data.paymentId)}`, {
      method: "GET",
    })) as RazorpayPayment;

    console.log("Payment details:", { 
      id: payment.id, 
      order_id: payment.order_id, 
      amount: payment.amount, 
      currency: payment.currency, 
      status: payment.status,
      captured: payment.captured,
      email: payment.email,
      contact: payment.contact
    });

    if (!payment?.id || payment.order_id !== data.orderId) {
      throw new Error("Payment does not belong to this order.");
    }

    if (payment.currency !== "INR") {
      throw new Error(`Payment currency mismatch. Expected: INR, Got: ${payment.currency}`);
    }

    // Validate amount - for dynamic courses, we don't validate against hardcoded amounts
    // since they can have any price set in Firestore

    if (!(payment.captured === true || payment.status === "authorized")) {
      throw new Error(`Payment is not successful yet (status: ${payment.status}, captured: ${payment.captured}). Please wait a few moments and try again.`);
    }

    const order = (await razorpayFetch(`/orders/${encodeURIComponent(data.orderId)}`, {
      method: "GET",
    })) as RazorpayOrder;

    console.log("Order details:", { 
      id: order.id, 
      amount: order.amount, 
      currency: order.currency 
    });

    if (!order?.id || order.currency !== "INR") {
      throw new Error("Order details do not match expected values.");
    }

    // Validate order amount matches payment amount
    if (order.amount !== payment.amount) {
      throw new Error("Order amount does not match payment amount.");
    }

    console.log("Payment verified successfully, proceeding to grant access on server");

    // Server-side Access Granting
    const notes = (order as any).notes || {};
    const courseIds = notes.courseIds ? notes.courseIds.split(",") : [];
    const customerEmail = notes.customerEmail || payment.email || "";
    const userId = data.userId || customerEmail;
    const isGuest = data.isGuest || false;
    
    if (courseIds.length > 0) {
      try {
        const db = getAdminFirestore();
        const expiresAt = isGuest ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null;
        const grantedAt = new Date().toISOString();
        
        for (const cId of courseIds) {
          const accessRef = db.collection("courseAccess");
          const snapshot = await accessRef
            .where("userId", "==", userId)
            .where("courseId", "==", cId)
            .get();
            
          const accessData: any = {
            userId,
            email: customerEmail,
            paymentId: data.paymentId,
            orderId: data.orderId,
            courseId: cId,
            grantedAt,
          };
          if (expiresAt) {
            accessData.expiresAt = expiresAt;
          }

          if (!snapshot.empty) {
            const docId = snapshot.docs[0].id;
            await accessRef.doc(docId).set(accessData, { merge: true });
            console.log(`Updated access for ${userId} to course ${cId}`);
          } else {
            await accessRef.add(accessData);
            console.log(`Created new access for ${userId} to course ${cId}`);
          }
        }
      } catch (err) {
        console.error("Failed to grant access on server:", err);
        // We still return true so client knows payment succeeded, but log error
      }
    }

    return {
      verified: true as const,
      orderId: data.orderId,
      paymentId: data.paymentId,
      email: payment.email || null,
      courseIds,
    };
  });
