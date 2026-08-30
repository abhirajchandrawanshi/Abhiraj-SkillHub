/**
 * Simple Admin Setup Script using Client Firebase SDK
 * 
 * This script creates the initial admin user in Firebase Authentication and Firestore.
 * Run this once to set up your admin account.
 * 
 * Usage: npm run setup-admin
 */

import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
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

async function setupAdmin() {
  console.log("🔧 Setting up admin account...");

  // Validate environment variables
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error("❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
    process.exit(1);
  }

  if (adminPassword.length < 6) {
    console.error("❌ Error: Admin password must be at least 6 characters");
    process.exit(1);
  }

  try {
    // Initialize Firebase Client
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    console.log("✅ Firebase initialized");

    // Create user in Firebase Auth
    console.log(`📧 Creating admin user: ${adminEmail}`);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      const user = userCredential.user;

      console.log(`✅ Firebase Auth user created: ${user.uid}`);

      // Create admin document in Firestore
      const adminDoc = {
        uid: user.uid,
        email: adminEmail,
        role: "superadmin",
        createdAt: serverTimestamp(),
        lastLogin: null,
      };

      await setDoc(doc(db, "adminUsers", user.uid), adminDoc);

      console.log("✅ Admin document created in Firestore");
      console.log("🎉 Admin setup completed successfully!");
      console.log("\n📋 Admin Credentials:");
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log("\n🔐 You can now login at: http://localhost:3000/admin/login");

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log("⚠️  Admin user already exists in Firebase Auth.");
        console.log("ℹ️  If you need to reset the admin user, delete it from Firebase Console first.");
        console.log("ℹ️  Then run this script again to recreate it.");
        console.log("\n🔐 You can still try to login at: http://localhost:3000/admin/login");
      } else {
        throw error;
      }
    }

  } catch (error) {
    console.error("❌ Error during admin setup:", error);
    process.exit(1);
  }
}

// Run the setup
setupAdmin().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error("❌ Setup failed:", error);
  process.exit(1);
});
