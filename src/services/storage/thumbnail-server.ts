/**
 * Server-side native thumbnail storage using Firestore database.
 * Completely free, zero external storage buckets, zero CORS errors,
 * zero Supabase egress limits, and served with 1-year browser caching.
 */

import { createServerFn } from "@tanstack/react-start";
import { getAdminFirestore } from "@/services/database/admin-firestore";
import { z } from "zod";
import crypto from "crypto";

export const uploadThumbnailServer = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fileName: z.string().min(1),
      fileBase64: z.string().min(1),
      fileType: z.string().default("image/webp"),
      folder: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    console.log("[ThumbnailServer] Storing thumbnail for", data.fileName);

    try {
      const db = await getAdminFirestore();
      const uniqueSuffix = crypto.randomBytes(6).toString("hex");
      const thumbId = `th_${Date.now()}_${uniqueSuffix}`;

      await db.collection("thumbnails").doc(thumbId).set({
        fileName: data.fileName,
        base64: data.fileBase64,
        contentType: data.fileType || "image/webp",
        createdAt: new Date().toISOString(),
      });

      const publicUrl = `/api/thumbnail/${thumbId}`;
      console.log("[ThumbnailServer] Successfully stored thumbnail. Public URL:", publicUrl);

      return { publicUrl };
    } catch (err: any) {
      console.error("[ThumbnailServer] Error saving thumbnail:", err?.message || err);
      throw new Error(`Failed to save thumbnail: ${err?.message || "Internal error"}`);
    }
  });
