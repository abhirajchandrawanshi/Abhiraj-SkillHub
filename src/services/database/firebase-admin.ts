/**
 * Firebase Admin SDK Configuration
 * Server-side Firebase operations with admin privileges
 * This module should only be imported in server-side code
 */

let adminApp: any = null;
let adminDb: any = null;
let adminAuth: any = null;

export function initializeFirebaseAdmin() {
  if (adminApp) {
    return { app: adminApp, db: adminDb, auth: adminAuth };
  }

  try {
    // Dynamic import to avoid client-side evaluation
    const admin = require("firebase-admin");
    
    const serviceAccount = {
      type: process.env['FIREBASE_ADMIN_TYPE'],
      project_id: process.env['FIREBASE_ADMIN_PROJECT_ID'],
      private_key_id: process.env['FIREBASE_ADMIN_PRIVATE_KEY_ID'],
      private_key: process.env['FIREBASE_ADMIN_PRIVATE_KEY']?.replace(/\\n/g, '\n'),
      client_email: process.env['FIREBASE_ADMIN_CLIENT_EMAIL'],
      client_id: process.env['FIREBASE_ADMIN_CLIENT_ID'],
      auth_uri: process.env['FIREBASE_ADMIN_AUTH_URI'],
      token_uri: process.env['FIREBASE_ADMIN_TOKEN_URI'],
      auth_provider_x509_cert_url: process.env['FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL'],
      client_x509_cert_url: process.env['FIREBASE_ADMIN_CLIENT_X509_CERT_URL'],
      universe_domain: process.env['FIREBASE_ADMIN_UNIVERSE_DOMAIN'],
    };

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    adminDb = admin.firestore();
    adminDb.settings({ preferRest: true });
    adminAuth = admin.auth();

    console.log("✅ Firebase Admin SDK initialized successfully");
    return { app: adminApp, db: adminDb, auth: adminAuth };
  } catch (error) {
    console.error("❌ Error initializing Firebase Admin SDK:", error);
    throw new Error("Failed to initialize Firebase Admin SDK");
  }
}

export function getAdminDb(): any {
  if (!adminDb) {
    const { db } = initializeFirebaseAdmin();
    return db;
  }
  return adminDb;
}

export function getAdminAuth(): any {
  if (!adminAuth) {
    const { auth } = initializeFirebaseAdmin();
    return auth;
  }
  return adminAuth;
}

export function getAdminApp(): any {
  if (!adminApp) {
    const { app } = initializeFirebaseAdmin();
    return app;
  }
  return adminApp;
}
