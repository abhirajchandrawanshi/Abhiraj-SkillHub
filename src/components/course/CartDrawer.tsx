import { useState, useEffect } from "react";
import { X, ShoppingCart, Trash2, Tag, ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/features/cart/use-cart";
import type { BundleOffer } from "@/lib/bundle-offers";
import { getActiveBundleOffers, findMatchingOffer } from "@/lib/bundle-offers";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  onCheckout: (totalPrice: number, matchedOffer: BundleOffer | null) => void;
}

export function CartDrawer({ open, onClose, onCheckout }: CartDrawerProps) {
  const { cartItems, removeFromCart, cartCount } = useCart();
  const [bundleOffers, setBundleOffers] = useState<BundleOffer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);

  useEffect(() => {
    if (open && cartItems.length > 0) {
      setOffersLoading(true);
      getActiveBundleOffers()
        .then(setBundleOffers)
        .catch(() => setBundleOffers([]))
        .finally(() => setOffersLoading(false));
    }
  }, [open, cartItems.length]);

  const cartCourseIds = cartItems.map((c) => c.id);
  const matchedOffer = findMatchingOffer(cartCourseIds, bundleOffers);

  const originalTotal = cartItems.reduce((sum, c) => sum + c.price, 0);
  const totalPrice = matchedOffer ? matchedOffer.bundlePrice : originalTotal;
  const savings = originalTotal - totalPrice;

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-sm bg-background border-l border-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-bold">
                  Cart{" "}
                  {cartCount > 0 && (
                    <span className="text-sm text-muted-foreground font-normal">
                      ({cartCount} {cartCount === 1 ? "course" : "courses"})
                    </span>
                  )}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 hover:bg-secondary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 opacity-20" />
                  <p className="text-sm font-medium">Your cart is empty</p>
                  <p className="text-xs text-center">
                    Browse courses and add them here to purchase together
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border"
                    >
                      {course.thumbnail && (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight line-clamp-2">
                          {course.title}
                        </p>
                        <p className="text-sm font-bold text-primary mt-1">
                          ₹{course.price}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(course.id)}
                        className="p-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                        title="Remove from cart"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {/* Bundle Offer Banner */}
                  {offersLoading && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground p-3">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Checking bundle offers…
                    </div>
                  )}

                  {!offersLoading && matchedOffer && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                    >
                      <Tag className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-green-700 dark:text-green-400">
                          🎉 Bundle Deal Applied: {matchedOffer.title}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                          Save ₹{savings} with this bundle!
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {cartItems.length > 0 && (
              <div className="p-5 border-t border-border space-y-4">
                {/* Price breakdown */}
                {matchedOffer && (
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Original total</span>
                      <span className="line-through">₹{originalTotal}</span>
                    </div>
                    <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                      <span>Bundle discount</span>
                      <span>-₹{savings}</span>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Total</span>
                  <span className="font-display text-2xl font-bold text-foreground">
                    ₹{totalPrice}
                  </span>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => onCheckout(totalPrice, matchedOffer)}
                >
                  Checkout <ArrowRight className="h-4 w-4 ml-2" />
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  One payment · Lifetime access to all {cartCount} courses
                </p>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
