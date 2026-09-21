import { getDb } from "@/services/database/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  updateDoc,
} from "firebase/firestore";

export interface BundleOffer {
  id: string;
  title: string;
  courseIds: string[];
  bundlePrice: number;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

function getDbSafe() {
  const db = getDb();
  if (!db) throw new Error("Firestore is not initialized.");
  return db;
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

/** Create a new bundle offer */
export async function createBundleOfferClient(
  data: Omit<BundleOffer, "id" | "createdAt" | "updatedAt">
): Promise<BundleOffer> {
  const db = getDbSafe();
  const ref = collection(db, "bundleOffers");
  const payload = {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const docRef = await addDoc(ref, payload);
  return { id: docRef.id, ...payload };
}

/** Update an existing bundle offer */
export async function updateBundleOfferClient(
  id: string,
  data: Partial<Omit<BundleOffer, "id" | "createdAt">>
): Promise<void> {
  const db = getDbSafe();
  const ref = doc(db, "bundleOffers", id);
  await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() });
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

  // Pick the offer with the most courses (most specific), tie-break by savings
  return matching.sort((a, b) => b.courseIds.length - a.courseIds.length)[0] ?? null;
}
