import { getDb } from "@/services/database/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
  addDoc,
  updateDoc,
} from "firebase/firestore";

export interface BundleOffer {
  id: string;
  title?: string;              // Optional title (banner image can stand alone)
  courseIds: string[];
  bundlePrice: number;
  active: boolean;
  imageUrl?: string;           // Rectangular banner image for home page
  subtitle?: string;           // Tagline / callout text
  isExclusiveBanner?: boolean; // Featured as the main home page banner
  createdAt: string;
  updatedAt?: string;
}

function getDbSafe() {
  const db = getDb();
  if (!db) throw new Error("Firestore is not initialized.");
  return db;
}

/** Sanitize objects before Firestore writes — removes all undefined keys */
function sanitizeFirestoreData<T extends Record<string, any>>(obj: T): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

/** Fetch all bundle offers (admin) */
export async function getBundleOffersClient(): Promise<BundleOffer[]> {
  const db = getDbSafe();
  const ref = collection(db, "bundleOffers");
  const snap = await getDocs(ref);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BundleOffer));
}

/** Fetch active bundle offers (public) */
export async function getActiveBundleOffers(): Promise<BundleOffer[]> {
  const db = getDbSafe();
  const ref = collection(db, "bundleOffers");
  const q = query(ref, where("active", "==", true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BundleOffer));
}

/** Fetch the active featured banner offer for the home page */
export async function getActiveBannerOffer(): Promise<BundleOffer | null> {
  const offers = await getActiveBundleOffers();
  // Prefer offer with isExclusiveBanner and an image, or any active offer with an image
  const featured =
    offers.find((o) => o.active && o.isExclusiveBanner && o.imageUrl) ||
    offers.find((o) => o.active && o.imageUrl);
  return featured || null;
}

/** Create a new bundle offer */
export async function createBundleOfferClient(
  data: Omit<BundleOffer, "id" | "createdAt" | "updatedAt">
): Promise<BundleOffer> {
  const db = getDbSafe();
  const ref = collection(db, "bundleOffers");
  const now = new Date().toISOString();
  const payload = sanitizeFirestoreData({
    ...data,
    title: data.title?.trim() || "",
    subtitle: data.subtitle?.trim() || "",
    imageUrl: data.imageUrl?.trim() || "",
    createdAt: now,
    updatedAt: now,
  });
  const docRef = await addDoc(ref, payload);
  return { id: docRef.id, ...payload } as BundleOffer;
}

/** Update an existing bundle offer */
export async function updateBundleOfferClient(
  id: string,
  data: Partial<Omit<BundleOffer, "id" | "createdAt">>
): Promise<void> {
  const db = getDbSafe();
  const ref = doc(db, "bundleOffers", id);
  const now = new Date().toISOString();
  const payload = sanitizeFirestoreData({
    ...data,
    ...(data.title !== undefined ? { title: data.title.trim() } : {}),
    ...(data.subtitle !== undefined ? { subtitle: data.subtitle.trim() } : {}),
    ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl.trim() } : {}),
    updatedAt: now,
  });
  await updateDoc(ref, payload);
}

/** Delete a bundle offer */
export async function deleteBundleOfferClient(id: string): Promise<void> {
  const db = getDbSafe();
  const ref = doc(db, "bundleOffers", id);
  await deleteDoc(ref);
}

/**
 * Find the best matching bundle offer for the given set of cart course IDs.
 * A bundle matches if ALL its courseIds are present in the cart.
 * If multiple match, return the one with the highest savings.
 */
export function findMatchingOffer(
  cartCourseIds: string[],
  offers: BundleOffer[]
): BundleOffer | null {
  const cartSet = new Set(cartCourseIds);
  const matching = offers.filter(
    (o) => o.active && o.courseIds.every((id) => cartSet.has(id))
  );
  if (matching.length === 0) return null;

  // Pick the offer with the most courses, tie-break by savings
  return matching.sort((a, b) => b.courseIds.length - a.courseIds.length)[0] ?? null;
}
