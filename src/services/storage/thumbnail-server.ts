/**
 * Server-side Firebase Storage thumbnail upload function.
 * Uses Firebase Admin SDK credentials from .env to upload thumbnails
 * directly to Google Firebase Storage without hitting Supabase quotas,
 * and generates a permanent, high-performance public CDN download URL.
 */

import { createServerFn } from "@tanstack/react-start";
import { getAdminApp } from "@/services/database/admin-firestore";
import { z } from "zod";
import crypto from "crypto";

export const uploadThumbnailServer = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fileName: z.string().min(1),
      fileBase64: z.string().min(1),
      fileType: z.string().default("image/webp"),
      folder: z.string().default("course-thumbnails"),
    })
  )
  .handler(async ({ data }) => {
    console.log("uploadThumbnailServer: starting server-side upload for", data.fileName);

    try {
      const app = await getAdminApp();
      const { getStorage } = await import("firebase-admin/storage");

      const bucketName =
        process.env["VITE_FIREBASE_STORAGE_BUCKET"] ||
        process.env["FIREBASE_STORAGE_BUCKET"] ||
        "abhiraj-skillsup.firebasestorage.app";

      const storage = getStorage(app);
      const bucket = storage.bucket(bucketName);

      const sanitizedName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = data.folder
        ? `${data.folder}/${Date.now()}-${sanitizedName}`
        : `${Date.now()}-${sanitizedName}`;

      const file = bucket.file(storagePath);
      const buffer = Buffer.from(data.fileBase64, "base64");
      const downloadToken = crypto.randomUUID();

      await file.save(buffer, {
        metadata: {
          contentType: data.fileType,
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
          },
          cacheControl: "public, max-age=31536000",
        },
      });

      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;
      console.log("uploadThumbnailServer: uploaded successfully to Firebase:", publicUrl);

      return { publicUrl };
    } catch (err: any) {
      console.error("uploadThumbnailServer error:", err?.message || err);
      throw new Error(`Firebase Storage upload failed: ${err?.message || "Unknown error"}`);
    }
  });

