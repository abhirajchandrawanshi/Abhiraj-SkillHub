/**
 * Server-side Supabase Storage functions
 * Uses SUPABASE_SERVICE_ROLE_KEY for privileged operations (PDF upload, signed URLs)
 * This file should only be imported in server-side code (createServerFn handlers)
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ── Supabase admin client (service role) ──────────────────────────────

function getSupabaseAdmin() {
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase server config. Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── Firebase Admin (reuse existing init if available) ─────────────────

function getAdminFirestore() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  const privateKey = process.env['FIREBASE_ADMIN_PRIVATE_KEY']?.replace(/\\n/g, "\n");
  const projectId = process.env['FIREBASE_ADMIN_PROJECT_ID'];
  const clientEmail = process.env['FIREBASE_ADMIN_CLIENT_EMAIL'];

  if (!privateKey || !projectId || !clientEmail) {
    throw new Error("Firebase Admin credentials not configured");
  }

  const app = initializeApp({
    credential: cert({
      projectId,
      privateKey,
      clientEmail,
    }),
  });

  return getFirestore(app);
}

// ── Server function: Upload a course PDF ──────────────────────────────

export const uploadCoursePdf = createServerFn({ method: "POST" })
  .validator(
    z.object({
      courseId: z.string().min(1),
      fileName: z.string().min(1),
      fileBase64: z.string().min(1),
      fileType: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    console.log("uploadCoursePdf: starting upload for course", data.courseId);

    const supabase = getSupabaseAdmin();

    // Decode base64 to buffer
    const fileBuffer = Buffer.from(data.fileBase64, "base64");

    // Build a unique storage path
    const sanitizedName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `courses/${data.courseId}/${Date.now()}-${sanitizedName}`;

    const { data: uploadData, error } = await supabase.storage
      .from("course-pdfs")
      .upload(storagePath, fileBuffer, {
        contentType: data.fileType,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("uploadCoursePdf: Supabase upload error:", error);
      throw new Error(`PDF upload failed: ${error.message}`);
    }

    console.log("uploadCoursePdf: success, path =", uploadData.path);

    // Return the storage path (NOT a public URL)
    return { pdfPath: uploadData.path };
  });

// ── Server function: Generate a signed URL for a course PDF ───────────

export const createSignedPdfUrl = createServerFn({ method: "POST" })
  .validator(
    z.object({
      courseId: z.string().min(1),
      pdfPath: z.string().min(1),
      userId: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    console.log("createSignedPdfUrl: checking access for user", data.userId, "course", data.courseId);

    // ── 1. Verify course access in Firestore ──────────────────────
    const db = getAdminFirestore();
    const accessRef = db.collection("courseAccess");
    const snapshot = await accessRef
      .where("userId", "==", data.userId)
      .where("courseId", "==", data.courseId)
      .get();

    if (snapshot.empty) {
      // Also check by email (guest purchases use email as userId)
      const emailSnapshot = await accessRef
        .where("email", "==", data.userId)
        .where("courseId", "==", data.courseId)
        .get();

      if (emailSnapshot.empty) {
        console.warn("createSignedPdfUrl: access denied for user", data.userId);
        throw new Error("You do not have access to this course.");
      }

      // Check expiry for guest purchases
      const guestDocData = emailSnapshot.docs[0];
      if (guestDocData) {
        const guestDoc = guestDocData.data();
        if (guestDoc['expiresAt']) {
          const expiryDate = new Date(guestDoc['expiresAt'] as string);
          if (new Date() > expiryDate) {
            throw new Error("Your access to this course has expired.");
          }
        }
      }
    } else {
      // Check expiry for found access
      const accessDocData = snapshot.docs[0];
      if (accessDocData) {
        const accessDoc = accessDocData.data();
        if (accessDoc['expiresAt']) {
          const expiryDate = new Date(accessDoc['expiresAt'] as string);
          if (new Date() > expiryDate) {
            throw new Error("Your access to this course has expired.");
          }
        }
      }
    }

    // ── 2. Generate signed URL (1 hour expiry) ────────────────────
    const supabase = getSupabaseAdmin();

    const { data: signedData, error } = await supabase.storage
      .from("course-pdfs")
      .createSignedUrl(data.pdfPath, 3600); // 3600 seconds = 1 hour

    if (error) {
      console.error("createSignedPdfUrl: signed URL error:", error);
      throw new Error(`Failed to generate download URL: ${error.message}`);
    }

    console.log("createSignedPdfUrl: signed URL generated successfully");
    return { signedUrl: signedData.signedUrl };
  });
