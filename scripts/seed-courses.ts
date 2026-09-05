/**
 * Seed script to add legacy hard-coded courses to Firestore.
 * Run once with: npx tsx scripts/seed-courses.ts
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import * as path from "path";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

function getAdminFirestore() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!privateKey || !process.env.FIREBASE_ADMIN_PROJECT_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
    throw new Error("Firebase Admin credentials not configured. Check your .env file.");
  }

  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      privateKey,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    }),
  });

  return getFirestore(app);
}

const LEGACY_COURSES = [
  {
    id: "python",
    title: "Python Notes / Python course",
    subtitle: "A 16-week, project-first program — ship six products, get code reviewed, and leave with a portfolio recruiters actually read.",
    description: "Complete Python Notes from basics to advanced. Well-structured content for easy learning with downloadable PDF format and lifetime access to all materials.",
    price: 1,
    originalPrice: 199,
    category: "Programming",
    instructor: "Abhiraj Chandrawanshi",
    duration: "16 weeks · 120 hrs",
    status: "published" as const,
    accessInfo: "/python-interview-questions.pdf",
    details: "Complete Python Notes covering basics to advanced topics. Includes downloadable PDF, well-structured content, and lifetime access.",
    thumbnail: "",
  },
  {
    id: "internships",
    title: "100+ Paid Internships",
    subtitle: "Curated list of 100+ paid internship opportunities in top companies with complete application details.",
    description: "Curated list of 100+ paid internship opportunities. Includes company details, stipend information, direct application links, and regular updates with new opportunities.",
    price: 5,
    originalPrice: 199,
    category: "Business",
    instructor: "Abhiraj Chandrawanshi",
    duration: "Lifetime access",
    status: "published" as const,
    accessInfo: "https://docs.google.com/spreadsheets/d/14YFhJa9aGHbBhCmY2cI5YtOGs3NBO1n3DT0fTVwc_DM/edit?usp=drivesdk",
    details: "Complete list with company details, stipend, and application links. Featured opportunities include positions at companies like Faabit Designs, Nsse Fab, DeepThought CultureTech, and many more!",
    thumbnail: "",
  },
  {
    id: "omniroute",
    title: "OmniRoute Setup for Free Claude Tokens",
    subtitle: "Easy 4 step setup to get 1.5 Billion AI tokens each month completely FREE",
    description: "Easy 4 step setup guide to get 1.5 Billion AI tokens each month completely FREE using OmniRoute. Direct access to the setup resource included.",
    price: 9,
    originalPrice: 499,
    category: "Other",
    instructor: "Abhiraj Chandrawanshi",
    duration: "Quick setup",
    status: "published" as const,
    accessInfo: "https://drive.google.com/file/d/1FgyD5AFVnuVEGp7XqiE3H5DlAkLEYKPB/view?usp=sharing",
    details: "Easy 4 step setup to get 1.5 Billion AI tokens each month completely FREE. Get direct access to the setup resource.",
    thumbnail: "",
  },
  {
    id: "testing",
    title: "Payment & Access Testing",
    subtitle: "DO NOT PAY - this is for testing purpose",
    description: "This is a ₹1 test payment to verify the complete payment and access system. Tests Razorpay payment integration, server-side payment verification, Firestore purchase recording, course access restoration, email delivery system, and access persistence.",
    price: 1,
    originalPrice: 0,
    category: "Other",
    instructor: "System",
    duration: "Test only",
    status: "published" as const,
    accessInfo: "",
    details: "Testing course for verifying payment and access flow. Tests: Razorpay integration, server-side verification, Firestore recording, access restoration, email delivery, and access persistence.",
    thumbnail: "",
  },
];

async function seedCourses() {
  console.log("🌱 Starting course seeding...\n");
  
  const db = getAdminFirestore();

  for (const course of LEGACY_COURSES) {
    const { id, ...data } = course;
    const docRef = db.collection("courses").doc(id);
    const existing = await docRef.get();

    if (existing.exists) {
      console.log(`⏭️  Course "${id}" already exists in Firestore. Skipping.`);
      continue;
    }

    await docRef.set({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log(`✅ Seeded course: "${course.title}" (ID: ${id}, Price: ₹${course.price})`);
  }

  console.log("\n🎉 Seeding complete!");
}

seedCourses().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
