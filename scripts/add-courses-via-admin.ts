/**
 * Script to add courses to Firestore using the admin client functions
 * This bypasses security rules by using the admin authentication
 * 
 * Usage: npx tsx scripts/add-courses-via-admin.ts
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
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

// Sample course data that should be in Firestore
const sampleCourses = [
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
  console.log("🔍 Adding courses to Firestore using client SDK...");
  
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log("✅ Firebase initialized");
    console.log("📊 Project ID:", process.env.VITE_FIREBASE_PROJECT_ID);
    
    for (const course of sampleCourses) {
      console.log(`\n📝 Adding course: ${course.title}`);
      
      try {
        const coursesRef = collection(db, "courses");
        const newCourseRef = doc(coursesRef);
        
        const courseData = {
          ...course,
          id: newCourseRef.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        await setDoc(newCourseRef, courseData);
        console.log(`✅ Successfully added course: ${course.title}`);
        console.log(`   Course ID: ${newCourseRef.id}`);
      } catch (error) {
        console.error(`❌ Error adding course ${course.title}:`, error);
      }
    }
    
    console.log("\n✅ Course addition process completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addCourses();