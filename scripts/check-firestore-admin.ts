/**
 * Script to check existing courses in Firestore using Firebase Admin SDK
 * This bypasses security rules and allows admin access
 * 
 * Usage: npx tsx scripts/check-firestore-admin.ts
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Firebase Admin Setup
const serviceAccount = {
  "type": "service_account",
  "project_id": process.env.FIREBASE_ADMIN_PROJECT_ID,
  "private_key_id": process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
  "private_key": process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  "client_email": process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_ADMIN_CLIENT_ID,
  "auth_uri": process.env.FIREBASE_ADMIN_AUTH_URI,
  "token_uri": process.env.FIREBASE_ADMIN_TOKEN_URI,
  "auth_provider_x509_cert_url": process.env.FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL,
  "client_x509_cert_url": process.env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL,
  "universe_domain": process.env.FIREBASE_ADMIN_UNIVERSE_DOMAIN,
};

// Sample course data that should be in Firestore
const sampleCourses = [
  {
    id: "python-complete-course",
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
    id: "dsa-complete-course", 
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

async function checkFirestoreCourses() {
  console.log("🔍 Checking Firestore courses using Admin SDK...");
  
  try {
    // Initialize Firebase Admin
    if (!getApps().length) {
      initializeApp({
        credential: cert(serviceAccount as any),
      });
    }

    const db = getFirestore();
    
    console.log("✅ Firebase Admin initialized");
    console.log("📊 Project ID:", process.env.FIREBASE_ADMIN_PROJECT_ID);
    
    // Get all courses from Firestore
    const coursesRef = db.collection("courses");
    const snapshot = await coursesRef.get();
    
    console.log(`\n📚 Found ${snapshot.docs.length} course(s) in Firestore:`);
    
    const existingCourseIds = new Set<string>();
    
    if (snapshot.empty) {
      console.log("⚠️  No courses found in Firestore!");
    } else {
      snapshot.forEach((doc) => {
        const data = doc.data();
        existingCourseIds.add(doc.id);
        console.log(`   - ${doc.id}: ${data.title || 'No title'} (status: ${data.status || 'unknown'})`);
      });
    }
    
    // Check which sample courses are missing
    console.log("\n🔍 Checking for missing courses...");
    const missingCourses = sampleCourses.filter(course => !existingCourseIds.has(course.id));
    
    if (missingCourses.length === 0) {
      console.log("✅ All sample courses exist in Firestore!");
    } else {
      console.log(`⚠️  ${missingCourses.length} course(s) missing from Firestore:`);
      missingCourses.forEach(course => {
        console.log(`   - ${course.id}: ${course.title}`);
      });
      
      console.log("\n📝 Adding missing courses to Firestore...");
      
      for (const course of missingCourses) {
        try {
          const courseRef = db.collection("courses").doc(course.id);
          await courseRef.set({
            ...course,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          console.log(`✅ Added course: ${course.title}`);
        } catch (error) {
          console.error(`❌ Failed to add course ${course.id}:`, error);
        }
      }
      
      console.log("\n✅ Missing courses added successfully!");
    }
    
    // Final check
    const finalSnapshot = await db.collection("courses").get();
    console.log(`\n📊 Final count: ${finalSnapshot.size} course(s) in Firestore`);
    
    console.log("\n📋 Course details:");
    finalSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`   📖 ${data.title}`);
      console.log(`      ID: ${doc.id}`);
      console.log(`      Price: ₹${data.price}`);
      console.log(`      Status: ${data.status}`);
      console.log(`      Category: ${data.category || 'N/A'}`);
      console.log("");
    });
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkFirestoreCourses();