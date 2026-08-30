/**
 * Admin Setup Script
 * 
 * This script creates the initial admin user in Firebase Authentication and Firestore.
 * Run this once to set up your admin account.
 * 
 * Usage: npm run setup-admin
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Firebase Admin Setup
const serviceAccount = {
  "type": "service_account",
  "project_id": process.env.VITE_FIREBASE_PROJECT_ID,
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  "private_key": process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_CLIENT_ID,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
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
    // Initialize Firebase Admin
    if (!getApps().length) {
      initializeApp({
        credential: cert(serviceAccount as any),
      });
    }

    const adminAuth = getAuth();
    const db = getFirestore();

    console.log("✅ Firebase Admin initialized");

    // Create user in Firebase Auth
    console.log(`📧 Creating admin user: ${adminEmail}`);
    
    try {
      const userRecord = await adminAuth.createUser({
        email: adminEmail,
        password: adminPassword,
        emailVerified: true,
      });

      console.log(`✅ Firebase Auth user created: ${userRecord.uid}`);

      // Create admin document in Firestore
      const adminDoc = {
        uid: userRecord.uid,
        email: adminEmail,
        role: "superadmin",
        createdAt: new Date(),
        lastLogin: null,
      };

      await db.collection("adminUsers").doc(userRecord.uid).set(adminDoc);

      console.log("✅ Admin document created in Firestore");
      console.log("🎉 Admin setup completed successfully!");
      console.log("\n📋 Admin Credentials:");
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log("\n⚠️  Please save these credentials securely and delete them from .env after setup.");
      console.log("🔐 You can now login at: http://localhost:3000/admin/login");

    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        console.log("⚠️  Admin user already exists. Updating Firestore document...");
        
        // Get existing user
        const userRecord = await adminAuth.getUserByEmail(adminEmail);
        
        // Update Firestore document
        const adminDoc = {
          uid: userRecord.uid,
          email: adminEmail,
          role: "superadmin",
          createdAt: userRecord.metadata.creationTime,
          lastLogin: null,
        };

        await db.collection("adminUsers").doc(userRecord.uid).set(adminDoc, { merge: true });
        
        console.log("✅ Admin document updated in Firestore");
        console.log("🎉 Admin setup completed successfully!");
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