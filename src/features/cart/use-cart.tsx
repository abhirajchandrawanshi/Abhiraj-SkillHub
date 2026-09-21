import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Course } from "@/services/database/firebase-courses";

interface CartContextValue {
  cartItems: Course[];
  addToCart: (course: Course) => void;
  removeFromCart: (courseId: string) => void;
  clearCart: () => void;
  isInCart: (courseId: string) => boolean;
  cartCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const CART_STORAGE_KEY = "skillearn-cart";

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

function saveCartToStorage(items: Course[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<Course[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    setCartItems(loadCartFromStorage());
  }, []);

  const addToCart = useCallback((course: Course) => {
    setCartItems((prev) => {
      if (prev.some((c) => c.id === course.id)) return prev;
      const next = [...prev, course];
      saveCartToStorage(next);
      return next;
    });
  }, []);

  const removeFromCart = useCallback((courseId: string) => {
    setCartItems((prev) => {
      const next = prev.filter((c) => c.id !== courseId);
      saveCartToStorage(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    saveCartToStorage([]);
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
