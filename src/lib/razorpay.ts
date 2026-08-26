import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { 
  COURSE_ID, 
  COURSE_PRICE_INR, 
  COURSE_TITLE,
  INTERNSHIP_ID,
  INTERNSHIP_PRICE_INR,
  INTERNSHIP_TITLE,
  TESTING_ID,
  TESTING_PRICE_INR,
  TESTING_TITLE
} from "@/lib/course";

const RAZORPAY_API = "https://api.razorpay.com/v1";

const customerSchema = z.object({
  courseId: z.union([z.literal(COURSE_ID), z.literal(INTERNSHIP_ID), z.literal(TESTING_ID)]),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
});

const paymentSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
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
      console.log("Creating Razorpay order for:", { courseId: data.courseId, name: data.name, email: data.email });
      
      const { keyId } = getRazorpayCredentials();
      
      // Determine price and title based on courseId
      const amountPaise = data.courseId === COURSE_ID 
        ? COURSE_PRICE_INR * 100 
        : data.courseId === INTERNSHIP_ID 
          ? INTERNSHIP_PRICE_INR * 100 
          : TESTING_PRICE_INR * 100;
      
      const courseTitle = data.courseId === COURSE_ID 
        ? COURSE_TITLE 
        : data.courseId === INTERNSHIP_ID 
          ? INTERNSHIP_TITLE 
          : TESTING_TITLE;

      console.log("Order details:", { amountPaise, courseTitle, currency: "INR" });

      const order = (await razorpayFetch("/orders", {
        method: "POST",
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: `${data.courseId}_${Date.now()}`.slice(0, 40),
          notes: {
            courseId: data.courseId,
            courseTitle: courseTitle,
            customerName: data.name,
            customerEmail: data.email,
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

    // Validate amount matches either course, internship, or testing price
    const validAmounts = [COURSE_PRICE_INR * 100, INTERNSHIP_PRICE_INR * 100, TESTING_PRICE_INR * 100];
    if (!validAmounts.includes(payment.amount)) {
      throw new Error(`Payment amount mismatch. Expected: ₹${COURSE_PRICE_INR}, ₹${INTERNSHIP_PRICE_INR}, or ₹${TESTING_PRICE_INR}, Got: ₹${payment.amount / 100}`);
    }

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

    console.log("Payment verified successfully");
    return {
      verified: true as const,
      orderId: data.orderId,
      paymentId: data.paymentId,
      email: payment.email || null,
    };
  });
