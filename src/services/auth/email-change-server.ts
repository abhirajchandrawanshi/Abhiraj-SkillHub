import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth as getAdminAuth } from "firebase-admin/auth";

// --- Firebase Admin SDK Initialization ---
function getAdminApp() {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!privateKey || !process.env.FIREBASE_ADMIN_PROJECT_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
    throw new Error("Firebase Admin credentials not configured");
  }
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      privateKey: privateKey,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    }),
  });
}

function getAdminFirestore() {
  const app = getAdminApp();
  const db = getFirestore(app);
  try { db.settings({ preferRest: true }); } catch (e) {}
  return db;
}

// --- Brevo Email Sender ---
async function sendOtpEmail(to: string, otp: string) {
  const apiKey = process.env['BREVO_API_KEY']?.trim();
  if (!apiKey) throw new Error("BREVO_API_KEY not configured");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Email Change Verification</h2>
      <p>You requested to change your email address on Abhiraj Academy.</p>
      <p>Your OTP is: <strong style="font-size: 24px; color: #f59e0b;">${otp}</strong></p>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    </div>
  `;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: "Abhiraj Courses", email: "abhirajvermen1@gmail.com" },
      to: [{ email: to }],
      subject: "Your Email Change OTP - Abhiraj Academy",
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to send email via Brevo: ${JSON.stringify(errorData)}`);
  }
}

// --- Server Functions ---

export const requestEmailChangeOtp = createServerFn({ method: "POST" })
  .validator(z.object({
    uid: z.string(),
    newEmail: z.string().email(),
  }))
  .handler(async ({ data }) => {
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
      const db = getAdminFirestore();
      
      // Store OTP in Firestore
      await db.collection("emailChangeOtps").doc(data.uid).set({
        otp,
        newEmail: data.newEmail,
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      });

      // Send email
      await sendOtpEmail(data.newEmail, otp);
      
      return { success: true };
    } catch (error) {
      console.error("Error requesting email change OTP:", error);
      return { success: false, error: error instanceof Error ? error.message : "Failed to send OTP" };
    }
  });

export const verifyEmailChangeOtp = createServerFn({ method: "POST" })
  .validator(z.object({
    uid: z.string(),
    otp: z.string(),
  }))
  .handler(async ({ data }) => {
    try {
      const db = getAdminFirestore();
      const auth = getAdminAuth(getAdminApp());
      
      const otpDoc = await db.collection("emailChangeOtps").doc(data.uid).get();
      if (!otpDoc.exists) {
        return { success: false, error: "No pending email change request found." };
      }
      
      const otpData = otpDoc.data();
      if (!otpData || otpData.otp !== data.otp) {
        return { success: false, error: "Invalid OTP." };
      }
      
      if (Date.now() > otpData.expiresAt) {
        return { success: false, error: "OTP has expired. Please request a new one." };
      }

      const newEmail = otpData.newEmail;

      // Check if new email already exists in Auth
      try {
        const existingUser = await auth.getUserByEmail(newEmail);
        if (existingUser && existingUser.uid !== data.uid) {
          // The email exists on another account. The user requested to delete it and take it.
          await auth.deleteUser(existingUser.uid);
          
          // Also optionally clean up userProfiles if needed
          await db.collection("userProfiles").doc(existingUser.uid).delete().catch(() => {});
        }
      } catch (err: any) {
        // If user doesn't exist, auth.getUserByEmail throws an error, which is fine (auth/user-not-found)
        if (err.code !== 'auth/user-not-found') {
          throw err;
        }
      }

      // Update the current user's email
      await auth.updateUser(data.uid, { email: newEmail, emailVerified: true });

      // Update userProfiles email
      await db.collection("userProfiles").doc(data.uid).set({ email: newEmail }, { merge: true });

      // Clean up OTP
      await db.collection("emailChangeOtps").doc(data.uid).delete();

      return { success: true, newEmail };
    } catch (error) {
      console.error("Error verifying email change OTP:", error);
      return { success: false, error: error instanceof Error ? error.message : "Failed to verify OTP and change email." };
    }
  });
