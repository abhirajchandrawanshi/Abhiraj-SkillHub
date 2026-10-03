/**
 * Thumbnail Migration Script
 *
 * Downloads course thumbnails from Supabase Storage, optimizes them to WebP,
 * saves them to public/course-thumbnails/, and updates Firestore records.
 *
 * Usage: npx tsx scripts/migrate-thumbnails.ts
 *
 * Phases:
 *   1. Fetch all courses from Firestore
 *   2. Download thumbnails from Supabase Storage URLs
 *   3. Convert to optimized WebP (max 600px width, ~80% quality)
 *   4. Save to public/course-thumbnails/<courseId>.webp
 *   5. Update Firestore thumbnail field to local path
 *   6. Generate migration report
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as path from "path";
import * as fs from "fs";
import { config } from "dotenv";

// Load environment variables
config();

// ── Firebase Admin Setup ──────────────────────────────────────────────
function getAdminFirestore() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  if (!privateKey || !projectId || !clientEmail) {
    throw new Error(
      "Firebase Admin credentials not configured. " +
        "Set FIREBASE_ADMIN_PRIVATE_KEY, FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL in .env",
    );
  }

  const app = initializeApp({
    credential: cert({ projectId, privateKey, clientEmail }),
  });

  const db = getFirestore(app);
  try {
    db.settings({ preferRest: true });
  } catch (e) {}
  return db;
}

// ── Helpers ───────────────────────────────────────────────────────────

const PUBLIC_DIR = path.resolve(process.cwd(), "public", "course-thumbnails");

/** Check if a URL points to Supabase Storage */
function isSupabaseUrl(url: string): boolean {
  return url.includes("supabase.co/storage") || url.includes("supabase.in/storage");
}

/** Generate a safe filename from course ID */
function safeFilename(courseId: string): string {
  return courseId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/** Download an image from a URL, return the Buffer */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** Optimize image to WebP using sharp */
async function optimizeToWebP(
  input: Buffer,
  maxWidth = 600,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  // Dynamic import of sharp
  const sharp = (await import("sharp")).default;

  const image = sharp(input);
  const metadata = await image.metadata();

  const originalWidth = metadata.width || 800;
  const originalHeight = metadata.height || 600;

  // Only resize if wider than maxWidth
  const needsResize = originalWidth > maxWidth;
  const targetWidth = needsResize ? maxWidth : originalWidth;
  const targetHeight = needsResize
    ? Math.round((originalHeight / originalWidth) * maxWidth)
    : originalHeight;

  let pipeline = image;
  if (needsResize) {
    pipeline = pipeline.resize(targetWidth, targetHeight, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const buffer = await pipeline.webp({ quality: 80, effort: 4 }).toBuffer();

  return { buffer, width: targetWidth, height: targetHeight };
}

// ── Migration Report ──────────────────────────────────────────────────

interface MigrationEntry {
  courseId: string;
  courseTitle: string;
  originalUrl: string;
  newPath: string;
  originalSize: number;
  optimizedSize: number;
  dimensions: string;
  status: "success" | "skipped" | "error";
  error?: string;
}

// ── Main Migration ────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║   AbhiAcademy Thumbnail Migration Script            ║");
  console.log("║   Supabase Storage → Vercel CDN (public/)           ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  // 1. Ensure output directory exists
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    console.log(`✅ Created directory: ${PUBLIC_DIR}\n`);
  }

  // 2. Connect to Firestore
  console.log("🔌 Connecting to Firestore...");
  const db = getAdminFirestore();
  console.log("✅ Connected to Firestore\n");

  // 3. Fetch all courses
  console.log("📚 Fetching all courses...");
  const coursesSnapshot = await db.collection("courses").get();
  const courses = coursesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Array<{ id: string; title?: string; thumbnail?: string; [key: string]: any }>;

  console.log(`   Found ${courses.length} courses\n`);

  // 4. Process each course
  const report: MigrationEntry[] = [];
  let totalOriginalBytes = 0;
  let totalOptimizedBytes = 0;
  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const course of courses) {
    const entry: MigrationEntry = {
      courseId: course.id,
      courseTitle: course.title || "Untitled",
      originalUrl: course.thumbnail || "",
      newPath: "",
      originalSize: 0,
      optimizedSize: 0,
      dimensions: "",
      status: "skipped",
    };

    // Skip if no thumbnail
    if (!course.thumbnail) {
      console.log(`⏭️  ${course.title || course.id}: No thumbnail, skipping`);
      skippedCount++;
      report.push(entry);
      continue;
    }

    // Skip if already a local path
    if (course.thumbnail.startsWith("/course-thumbnails/")) {
      console.log(`⏭️  ${course.title || course.id}: Already migrated, skipping`);
      entry.status = "skipped";
      skippedCount++;
      report.push(entry);
      continue;
    }

    // Process both Supabase URLs and any other external URLs
    const filename = `${safeFilename(course.id)}.webp`;
    const outputPath = path.join(PUBLIC_DIR, filename);
    const localPath = `/course-thumbnails/${filename}`;

    try {
      console.log(`\n📥 Downloading: ${course.title || course.id}`);
      console.log(`   URL: ${course.thumbnail.substring(0, 80)}...`);

      const originalBuffer = await downloadImage(course.thumbnail);
      entry.originalSize = originalBuffer.length;
      totalOriginalBytes += originalBuffer.length;

      console.log(`   Original: ${(originalBuffer.length / 1024).toFixed(1)} KB`);

      // Optimize to WebP
      console.log("   🔄 Converting to WebP...");
      const { buffer: optimized, width, height } = await optimizeToWebP(originalBuffer);
      entry.optimizedSize = optimized.length;
      entry.dimensions = `${width}×${height}`;
      totalOptimizedBytes += optimized.length;

      console.log(`   Optimized: ${(optimized.length / 1024).toFixed(1)} KB (${width}×${height})`);
      console.log(
        `   Savings: ${((1 - optimized.length / originalBuffer.length) * 100).toFixed(0)}%`,
      );

      // Save to public/
      fs.writeFileSync(outputPath, optimized);
      entry.newPath = localPath;

      // Update Firestore
      console.log("   📝 Updating Firestore...");
      await db.collection("courses").doc(course.id).update({
        thumbnail: localPath,
        // Preserve original URL for reference
        _originalThumbnailUrl: course.thumbnail,
      });

      entry.status = "success";
      migratedCount++;
      console.log(`   ✅ Migrated to ${localPath}`);
    } catch (err) {
      entry.status = "error";
      entry.error = err instanceof Error ? err.message : String(err);
      errorCount++;
      console.error(`   ❌ Error: ${entry.error}`);
    }

    report.push(entry);
  }

  // 5. Generate report
  console.log("\n\n" + "═".repeat(60));
  console.log("  MIGRATION REPORT");
  console.log("═".repeat(60));
  console.log(`  Total courses:    ${courses.length}`);
  console.log(`  Migrated:         ${migratedCount}`);
  console.log(`  Skipped:          ${skippedCount}`);
  console.log(`  Errors:           ${errorCount}`);
  console.log(`  Original total:   ${(totalOriginalBytes / 1024).toFixed(1)} KB`);
  console.log(`  Optimized total:  ${(totalOptimizedBytes / 1024).toFixed(1)} KB`);
  if (totalOriginalBytes > 0) {
    console.log(
      `  Total savings:    ${((1 - totalOptimizedBytes / totalOriginalBytes) * 100).toFixed(0)}%`,
    );
  }
  console.log("═".repeat(60));

  // Save report to file
  const reportPath = path.resolve(process.cwd(), "thumbnail-migration-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Full report saved to: ${reportPath}`);

  // Summary of what changed
  if (migratedCount > 0) {
    console.log("\n✅ NEXT STEPS:");
    console.log("   1. Verify images in public/course-thumbnails/");
    console.log("   2. Run 'npm run dev' and check course thumbnails load correctly");
    console.log("   3. Commit the public/course-thumbnails/ directory");
    console.log("   4. Deploy to Vercel");
    console.log(
      "   5. Thumbnails will now be served from Vercel CDN (free!) instead of Supabase Storage\n",
    );
  }

  if (errorCount > 0) {
    console.log("\n⚠️  Some thumbnails failed to migrate. Check the report for details.\n");
  }
}

main().catch((err) => {
  console.error("\n💥 Migration failed:", err);
  process.exit(1);
});
