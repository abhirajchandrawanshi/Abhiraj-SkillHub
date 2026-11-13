import { createClient } from "@supabase/supabase-js";
import { getStorageInstance, initializeFirebase } from "@/services/database/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { uploadThumbnailServer } from "./thumbnail-server";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

let supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (typeof window === "undefined") return null;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase URL or anon key is missing. Check your .env file.");
    return null;
  }
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabase;
}

/**
 * Converts a browser File into base64 string for server-side upload
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      if (base64) resolve(base64);
      else reject(new Error("Failed to read file as base64"));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an image in the browser using HTML Canvas before upload.
 * Reduces raw 3-5MB camera/screenshot images to ~50-90KB WebP files.
 * This saves ~98% bandwidth and prevents exceeding storage egress quotas.
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  quality = 0.82
): Promise<File> {
  // If not a compressible image type or already very small (< 100KB), return as-is
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/svg+xml" ||
    file.type === "image/gif" ||
    file.size <= 100 * 1024
  ) {
    return file;
  }

  if (typeof window === "undefined" || typeof document === "undefined") {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          try {
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(file);
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (!blob || blob.size >= file.size) {
                  resolve(file); // Compression didn't reduce size
                } else {
                  const newFileName = file.name.replace(/\.[^.]+$/, ".webp");
                  const compressed = new File([blob], newFileName, {
                    type: "image/webp",
                    lastModified: Date.now(),
                  });
                  console.log(
                    `[Image Compression] Compressed ${(file.size / 1024).toFixed(1)}KB → ${(compressed.size / 1024).toFixed(1)}KB`
                  );
                  resolve(compressed);
                }
              },
              "image/webp",
              quality
            );
          } catch (e) {
            console.warn("Canvas compression failed, using original file:", e);
            resolve(file);
          }
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    } catch {
      resolve(file);
    }
  });
}

/**
 * Upload a file directly to Firebase Storage via client SDK.
 */
export async function uploadToFirebaseStorage(
  file: File,
  folder = "course-thumbnails"
): Promise<string> {
  await initializeFirebase();
  const storage = getStorageInstance();
  if (!storage) {
    throw new Error("Firebase Storage client is not initialized.");
  }

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = folder
    ? `${folder}/${Date.now()}-${sanitizedName}`
    : `${Date.now()}-${sanitizedName}`;

  const storageRef = ref(storage, filePath);
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type || "image/webp",
    cacheControl: "public, max-age=31536000",
  });

  return await getDownloadURL(snapshot.ref);
}

/**
 * Upload a file with automatic compression and multi-provider fallback:
 * 1. Automatically compresses image to WebP (~50-90KB) to protect egress limits.
 * 2. Attempts client-side Firebase Storage first.
 * 3. Falls back to server-side Firebase Storage (Admin SDK, bypassing client rules).
 * 4. Falls back to Supabase Storage.
 *
 * @param file      The File object to upload
 * @param bucket    The Storage bucket name / folder (default: "course-thumbnails")
 * @param folder    Optional subfolder path inside the bucket
 * @returns         The public URL of the uploaded file
 */
export async function uploadToSupabase(
  file: File,
  bucket = "course-thumbnails",
  folder = "",
): Promise<string> {
  // 1. Compress image to minimize bandwidth and eliminate quota issues
  const optimizedFile = await compressImage(file);
  const targetFolder = folder ? `${bucket}/${folder}` : bucket;

  // 2. Try client-side Firebase Storage first
  try {
    const firebaseUrl = await uploadToFirebaseStorage(optimizedFile, targetFolder);
    if (firebaseUrl) {
      console.log("Uploaded successfully to Firebase Storage (client):", firebaseUrl);
      return firebaseUrl;
    }
  } catch (firebaseClientErr: any) {
    console.warn(
      "Client Firebase Storage skipped/failed, trying server-side Firebase Admin upload:",
      firebaseClientErr?.message || firebaseClientErr
    );
  }

  // 3. Try server-side Firebase Admin Storage (privileged, reliable, 100% free)
  try {
    const base64 = await fileToBase64(optimizedFile);
    const serverResult = await uploadThumbnailServer({
      data: {
        fileName: optimizedFile.name,
        fileBase64: base64,
        fileType: optimizedFile.type || "image/webp",
        folder: targetFolder,
      },
    });

    if (serverResult?.publicUrl) {
      console.log("Uploaded successfully to Firebase Storage (server):", serverResult.publicUrl);
      return serverResult.publicUrl;
    }
  } catch (serverErr: any) {
    console.warn(
      "Server Firebase Storage upload failed, attempting Supabase fallback:",
      serverErr?.message || serverErr
    );
  }

  // 4. Fall back to Supabase Storage
  const client = getSupabase();
  if (!client) {
    throw new Error(
      "Storage is not configured. Please paste an image URL directly into the 'Or Thumbnail URL' field."
    );
  }

  const sanitizedName = optimizedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = folder
    ? `${folder}/${Date.now()}-${sanitizedName}`
    : `${Date.now()}-${sanitizedName}`;

  const { data, error } = await client.storage.from(bucket).upload(filePath, optimizedFile, {
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    console.error("Supabase upload error:", error);
    const msg = error.message || "";
    if (
      msg.includes("exceed_cached_egress_quota") ||
      (error as any).statusCode === "402" ||
      (error as any).status === 402
    ) {
      throw new Error(
        "Storage bandwidth quota exceeded (exceed_cached_egress_quota). Paste an image URL directly into the 'Or Thumbnail URL' field (e.g. from ImgBB, PostImages, or Google Drive)."
      );
    }
    throw new Error(`Upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = client.storage.from(bucket).getPublicUrl(data.path);

  return publicUrl;
}

// Alias for semantic clarity in newer code
export const uploadImage = uploadToSupabase;


