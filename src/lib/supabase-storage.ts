import { createClient } from "@supabase/supabase-js";

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
 * Upload a file to Supabase Storage and return its public URL.
 *
 * @param file      The File object to upload
 * @param bucket    The Supabase Storage bucket name (default: "course-thumbnails")
 * @param folder    Optional subfolder path inside the bucket
 * @returns         The public URL of the uploaded file
 */
export async function uploadToSupabase(
  file: File,
  bucket = "course-thumbnails",
  folder = ""
): Promise<string> {
  const client = getSupabase();
  if (!client) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file."
    );
  }

  // Build a unique file path to avoid collisions
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = folder
    ? `${folder}/${Date.now()}-${sanitizedName}`
    : `${Date.now()}-${sanitizedName}`;

  const { data, error } = await client.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Supabase upload error:", error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get the public URL
  const {
    data: { publicUrl },
  } = client.storage.from(bucket).getPublicUrl(data.path);

  return publicUrl;
}
