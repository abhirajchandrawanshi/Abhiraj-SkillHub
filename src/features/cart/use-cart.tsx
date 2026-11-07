import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Course } from "@/services/database/firebase-courses";

interface CartContextValue {
  cartItems: Course[];
  addToCart: (course: Course) => void;
  removeFromCart: (courseId: string) => void;
  clearCart: () => void;
  isInCart: (courseId: string) => boolean;
  cartCount: number;
  lockedOfferId: string | null;
  setBundleCart: (courses: Course[], offerId: string) => void;
  unlockBundle: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const CART_STORAGE_KEY = "abhiacademy-cart";
const LOCKED_BUNDLE_KEY = "abhiacademy-cart-locked-bundle";

function loadCartFromStorage(): Course[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Course[];
  } catch {
    return [];
  }
}

function loadLockedBundleFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LOCKED_BUNDLE_KEY);
  } catch {
    return null;
  }
}

function saveCartToStorage(items: Course[], lockedOfferId: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  if (lockedOfferId) {
    window.localStorage.setItem(LOCKED_BUNDLE_KEY, lockedOfferId);
  } else {
    window.localStorage.removeItem(LOCKED_BUNDLE_KEY);
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<Course[]>([]);
  const [lockedOfferId, setLockedOfferId] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    setCartItems(loadCartFromStorage());
    setLockedOfferId(loadLockedBundleFromStorage());
  }, []);

  const addToCart = useCallback((course: Course) => {
    setCartItems((prev) => {
      if (prev.some((c) => c.id === course.id)) return prev;
      const next = [...prev, course];
      saveCartToStorage(next, lockedOfferId);
      return next;
    });
  }, [lockedOfferId]);

  const removeFromCart = useCallback((courseId: string) => {
    setCartItems((prev) => {
      const next = prev.filter((c) => c.id !== courseId);
      // If all items removed, unlock bundle
      const newLocked = next.length === 0 ? null : lockedOfferId;
      if (next.length === 0) setLockedOfferId(null);
      saveCartToStorage(next, newLocked);
      return next;
    });
  }, [lockedOfferId]);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setLockedOfferId(null);
    saveCartToStorage([], null);
  }, []);

  const unlockBundle = useCallback(() => {
    setLockedOfferId(null);
    saveCartToStorage(cartItems, null);
  }, [cartItems]);

  const setBundleCart = useCallback((courses: Course[], offerId: string) => {
    setCartItems(courses);
    setLockedOfferId(offerId);
    saveCartToStorage(courses, offerId);
  }, []);

  const isInCart = useCallback(
    (courseId: string) => cartItems.some((c) => c.id === courseId),
    [cartItems]
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        clearCart,
        isInCart,
        cartCount: cartItems.length,
        lockedOfferId,
        setBundleCart,
        unlockBundle,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
