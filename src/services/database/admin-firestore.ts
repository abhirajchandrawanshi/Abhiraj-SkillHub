// Centralized server-side Firebase Admin SDK initialization.
// Uses dynamic imports so that Node.js built-ins and google-auth-library
// are NEVER evaluated on the client/browser bundle.

let dbInstance: any = null;
let appInstance: any = null;

export async function getAdminApp(): Promise<any> {
  if (typeof window !== "undefined") {
    throw new Error("getAdminApp cannot be invoked in the browser");
  }

  if (appInstance) return appInstance;

  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const apps = getApps();
  if (apps.length > 0) {
    appInstance = apps[0];
    return appInstance;
  }

  const privateKey = process.env['FIREBASE_ADMIN_PRIVATE_KEY']?.replace(/\\n/g, '\n');
  const projectId = process.env['FIREBASE_ADMIN_PROJECT_ID'];
  const clientEmail = process.env['FIREBASE_ADMIN_CLIENT_EMAIL'];

  if (!privateKey || !projectId || !clientEmail) {
    throw new Error("Firebase Admin credentials not configured");
  }

  appInstance = initializeApp({
    credential: cert({
      projectId,
      privateKey,
      clientEmail,
    }),
  });

  return appInstance;
}

export async function getAdminFirestore(): Promise<any> {
  if (typeof window !== "undefined") {
    throw new Error("getAdminFirestore cannot be invoked in the browser");
  }

  if (dbInstance) {
    return dbInstance;
  }

  const app = await getAdminApp();
  const { getFirestore } = await import("firebase-admin/firestore");

  dbInstance = getFirestore(app);
  try {
    dbInstance.settings({ preferRest: true });
  } catch {
    // Ignore if already set
  }
  return dbInstance;
}

export async function getAdminAuthInstance(): Promise<any> {
  if (typeof window !== "undefined") {
    throw new Error("getAdminAuthInstance cannot be invoked in the browser");
  }

  const app = await getAdminApp();
  const { getAuth } = await import("firebase-admin/auth");
  return getAuth(app);
}
