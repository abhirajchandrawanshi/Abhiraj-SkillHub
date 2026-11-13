import { uploadThumbnailServer } from "./thumbnail-server";

/**
 * Converts a browser File into base64 string
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
 * Reduces raw 3-5MB camera/screenshot images to ~30-50KB WebP files.
 * This saves ~98% bandwidth and prevents exceeding storage quotas.
 */
export async function compressImage(
  file: File,
  maxWidth = 900,
  quality = 0.82
): Promise<File> {
  // If not a compressible image type or already very small (< 60KB), return as-is
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/svg+xml" ||
    file.type === "image/gif" ||
    file.size <= 60 * 1024
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
 * Upload a file with automatic compression and 100% free native server storage:
 * 1. Automatically compresses image to lightweight WebP (~30-50KB).
 * 2. Uploads through the same-origin server function (bypassing all CORS issues).
 * 3. Stores in Firestore and serves via /api/thumbnail/:id with 1-year browser cache.
 * 4. Fallback to direct data URL if the server is unreachable.
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
  // 1. Compress image to ~30-50KB WebP
  const optimizedFile = await compressImage(file, 900, 0.82);

  // 2. Read as base64 string
  const base64 = await fileToBase64(optimizedFile);

  // 3. Upload to server-side native storage (same-origin, 0 CORS)
  try {
    const serverResult = await uploadThumbnailServer({
      data: {
        fileName: optimizedFile.name,
        fileBase64: base64,
        fileType: "image/webp",
        folder: folder || bucket,
      },
    });

    if (serverResult?.publicUrl) {
      console.log("[Storage] Thumbnail saved successfully:", serverResult.publicUrl);
      return serverResult.publicUrl;
    }
  } catch (serverErr: any) {
    console.warn(
      "[Storage] Server storage call encountered an issue, falling back to data URL:",
      serverErr?.message || serverErr
    );
  }

  // 4. Safe fallback: return compressed base64 data URL directly
  // A 30-40KB data URL works anywhere with zero requests!
  return `data:image/webp;base64,${base64}`;
}

// Alias for semantic clarity in newer code
export const uploadImage = uploadToSupabase;



