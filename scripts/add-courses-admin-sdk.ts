/**
 * Script to add courses to Firestore using Firebase Client SDK with admin authentication
 * This uses the admin user authentication to bypass security rules
 * 
 * Usage: npx tsx scripts/add-courses-admin-sdk.ts
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDocs } from "firebase/firestore";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Firebase Client Configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

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
  console.log("🔍 Adding courses to Firestore using Admin Authentication...");
  
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    
    console.log("✅ Firebase initialized");
    console.log("📊 Project ID:", process.env.VITE_FIREBASE_PROJECT_ID);
    
    // Authenticate as admin user
    const adminEmail = "va7058060@gmail.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "your-password";
    
    console.log(`\n🔐 Authenticating as admin user: ${adminEmail}`);
    const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log("✅ Admin authentication successful");
    console.log(`📋 Admin User UID: ${userCredential.user.uid}`);
    console.log(`📋 Admin User Email: ${userCredential.user.email}`);
    
    // Get ID token to check claims
    const idToken = await userCredential.user.getIdToken();
    console.log(`📋 ID Token (first 100 chars): ${idToken.substring(0, 100)}...`);
    
    // Wait a moment for token to propagate
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check existing courses
    const coursesRef = collection(db, "courses");
    const existingSnapshot = await getDocs(coursesRef);
    
    console.log(`\n📚 Found ${existingSnapshot.docs.length} existing course(s) in Firestore`);
    
    const existingIds = new Set<string>();
    existingSnapshot.docs.forEach((doc) => {
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
        const courseRef = doc(coursesRef, courseId);
        await setDoc(courseRef, {
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
    const finalSnapshot = await getDocs(coursesRef);
    console.log(`\n📊 Final count: ${finalSnapshot.docs.length} course(s) in Firestore`);
    
    if (addedCount > 0) {
      console.log(`\n✅ Successfully added ${addedCount} new course(s)!`);
    } else {
      console.log("\nℹ️  No new courses added (all already exist)");
    }
    
    console.log("\n📋 All courses in Firestore:");
    finalSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`   📖 ${data.title} (${doc.id})`);
      console.log(`      Price: ₹${data.price}, Status: ${data.status}`);
    });
    
    // Sign out
    await auth.signOut();
    console.log("\n🔐 Admin signed out");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addCourses();