/**
 * Script to add courses to Firestore using Firebase Admin SDK
 * This bypasses all client-side security rules and has full admin privileges
 * 
 * Usage: npx tsx scripts/add-courses-admin-sdk-privileged.ts
 * 
 * Prerequisites:
 * - Set FIREBASE_ADMIN_* environment variables in .env file
 * - These are obtained from Firebase Console > Project Settings > Service Accounts
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Sample course data
const coursesToAdd = [
  {
    title: "Python Complete Course",
    subtitle: "Complete Python programming from basics to advanced",
    description: "Master Python programming with comprehensive coverage of fundamentals, data structures, OOP, and advanced concepts. Perfect for beginners and intermediate learners.",
    price: 999,
    originalPrice: 2999,
    discount: 67,
    category: "Programming",
    instructor: "Abhiraj Chandrawanshi",
    duration: "40 hours",
    status: "published" as const,
    thumbnail: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&h=400&fit=crop",
    details: "This course covers Python fundamentals, data structures, object-oriented programming, file handling, databases, web development with Flask/Django, and more.",
    accessInfo: "Lifetime access with video lectures, code examples, and projects.",
    metaTitle: "Python Complete Course - Learn Python Programming",
    metaDescription: "Master Python programming from basics to advanced concepts with hands-on projects and real-world examples."
  },
  {
    title: "DSA Complete Course", 
    subtitle: "Data Structures and Algorithms for interviews",
    description: "Comprehensive DSA course covering arrays, linked lists, trees, graphs, sorting, searching, dynamic programming, and more. Essential for coding interviews.",
    price: 1499,
    originalPrice: 4999,
    discount: 70,
    category: "Computer Science",
    instructor: "Abhiraj Chandrawanshi", 
    duration: "60 hours",
    status: "published" as const,
    thumbnail: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&h=400&fit=crop",
    details: "Master data structures and algorithms with practical implementations and interview preparation. Includes arrays, linked lists, stacks, queues, trees, graphs, sorting algorithms, and dynamic programming.",
    accessInfo: "Lifetime access with video lectures, coding practice, and interview preparation materials.",
    metaTitle: "DSA Complete Course - Data Structures and Algorithms",
    metaDescription: "Master data structures and algorithms for coding interviews with comprehensive coverage and practical implementations."
  }
];

async function addCourses() {
  console.log("🔍 Adding courses to Firestore using Firebase Admin SDK (privileged mode)...");
  
  try {
    // Check for required environment variables
    const requiredEnvVars = [
      'FIREBASE_ADMIN_TYPE',
      'FIREBASE_ADMIN_PROJECT_ID',
      'FIREBASE_ADMIN_PRIVATE_KEY_ID',
      'FIREBASE_ADMIN_PRIVATE_KEY',
      'FIREBASE_ADMIN_CLIENT_EMAIL',
      'FIREBASE_ADMIN_CLIENT_ID',
      'FIREBASE_ADMIN_AUTH_URI',
      'FIREBASE_ADMIN_TOKEN_URI',
      'FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL',
      'FIREBASE_ADMIN_CLIENT_X509_CERT_URL',
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}\n\nPlease add these to your .env file. You can get them from Firebase Console > Project Settings > Service Accounts > Generate New Private Key.`);
    }

    // Initialize Firebase Admin SDK
    const serviceAccount: any = {
      type: process.env.FIREBASE_ADMIN_TYPE,
      project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
      private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
      auth_uri: process.env.FIREBASE_ADMIN_AUTH_URI,
      token_uri: process.env.FIREBASE_ADMIN_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL,
      universe_domain: process.env.FIREBASE_ADMIN_UNIVERSE_DOMAIN || 'googleapis.com',
    };

    const app = getApps().length === 0 
      ? initializeApp({ credential: cert(serviceAccount) })
      : getApps()[0];

    const db = getFirestore(app);
    
    console.log("✅ Firebase Admin SDK initialized");
    console.log("📊 Project ID:", process.env.FIREBASE_ADMIN_PROJECT_ID);
    
    // Check existing courses
    const coursesRef = db.collection("courses");
    const existingSnapshot = await coursesRef.get();
    
    console.log(`\n📚 Found ${existingSnapshot.docs.length} existing course(s) in Firestore`);
    
    const existingIds = new Set<string>();
    existingSnapshot.forEach((doc: any) => {
      existingIds.add(doc.id);
      console.log(`   - ${doc.id}: ${doc.data().title || 'No title'}`);
    });
    
    // Add courses
    let addedCount = 0;
    for (const course of coursesToAdd) {
      const courseId = course.title.toLowerCase().replace(/\s+/g, '-') + "-course";
      
      if (existingIds.has(courseId)) {
        console.log(`\n⏭️  Skipping existing course: ${course.title}`);
        continue;
      }
      
      console.log(`\n📝 Adding course: ${course.title}`);
      
      try {
        const courseRef = coursesRef.doc(courseId);
        await courseRef.set({
          ...course,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        console.log(`✅ Successfully added course: ${course.title} (ID: ${courseId})`);
        addedCount++;
      } catch (error) {
        console.error(`❌ Failed to add course ${course.title}:`, error);
      }
    }
    
    // Final check
    const finalSnapshot = await coursesRef.get();
    console.log(`\n📊 Final count: ${finalSnapshot.docs.length} course(s) in Firestore`);
    
    if (addedCount > 0) {
      console.log(`\n✅ Successfully added ${addedCount} new course(s)!`);
    } else {
      console.log("\nℹ️  No new courses added (all already exist)");
    }
    
    console.log("\n📋 All courses in Firestore:");
    finalSnapshot.forEach((doc: any) => {
      const data = doc.data();
      console.log(`   📖 ${data.title} (${doc.id})`);
      console.log(`      Price: ₹${data.price}, Status: ${data.status}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("\n💡 To fix this issue:");
      console.error("1. Go to Firebase Console: https://console.firebase.google.com/");
      console.error("2. Select your project: abhiraj-skillsup");
      console.error("3. Go to Project Settings > Service Accounts");
      console.error("4. Click 'Generate New Private Key'");
      console.error("5. Download the JSON file");
      console.error("6. Copy the contents to your .env file with FIREBASE_ADMIN_ prefix");
    }
    process.exit(1);
  }
}

addCourses();
