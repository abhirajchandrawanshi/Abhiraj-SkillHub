/**
 * Admin Helper Script
 * 
 * This script helps with admin account management.
 * Usage: npm run admin-helper
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
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

async function showAdminOptions() {
  console.log("🔧 Admin Helper Script");
  console.log("=====================\n");
  
  const adminEmail = process.env.ADMIN_EMAIL || "va7058060@gmail.com";
  console.log(`Current admin email: ${adminEmail}\n`);
  
  console.log("Options:");
  console.log("1. Send password reset email");
  console.log("2. Test admin login");
  console.log("3. Exit\n");
  
  // For now, let's just provide information since we can't do interactive input easily
  console.log("To reset the admin password:");
  console.log("1. Go to Firebase Console: https://console.firebase.google.com/");
  console.log("2. Select your project: abhiraj-skillsup");
  console.log("3. Navigate to Authentication → Users");
  console.log("4. Find the admin user and click 'Reset Password'");
  console.log("5. Follow the email instructions\n");
  
  console.log("To test if the admin panel works:");
  console.log("1. Start your dev server: npm run dev");
  console.log("2. Navigate to: http://localhost:3000/admin/login");
  console.log("3. Login with your admin credentials\n");
}

// Run the helper
showAdminOptions().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});