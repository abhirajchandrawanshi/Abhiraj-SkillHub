import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, ShoppingCart, Trash2, Tag, ArrowRight, Loader2, Lock, Sparkles, AlertCircle, Percent } from "lucide-react";
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
  const { cartItems, removeFromCart, clearCart, cartCount, lockedOfferId } = useCart();

  const { data: bundleOffers = [], isLoading: offersLoading } = useQuery<BundleOffer[]>({
    queryKey: ["active-bundle-offers"],
    queryFn: getActiveBundleOffers,
    staleTime: 60 * 1000,
  });

  const cartCourseIds = useMemo(() => cartItems.map((c) => c.id), [cartItems]);

  const matchedOffer = useMemo(() => {
    if (lockedOfferId) {
      const locked = bundleOffers.find(
        (o) =>
          o.id === lockedOfferId &&
          o.active &&
          o.courseIds.every((id) => cartCourseIds.includes(id))
      );
      if (locked) return locked;
    }
    return findMatchingOffer(cartCourseIds, bundleOffers);
  }, [lockedOfferId, bundleOffers, cartCourseIds]);

  // If lockedOfferId is set, check if current bundle matches the locked offer
  const isLockedBundle =
    Boolean(lockedOfferId && matchedOffer && matchedOffer.id === lockedOfferId);
    Boolean(lockedOfferId && matchedOffer && matchedOffer.id === lockedOfferId);

  const originalTotal = cartItems.reduce((sum, c) => sum + c.price, 0);
  const totalPrice = matchedOffer ? matchedOffer.bundlePrice : originalTotal;
  const savings = Math.max(0, originalTotal - totalPrice);
  const savingsPct =
    originalTotal > 0 ? Math.round((savings / originalTotal) * 100) : 0;

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
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
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
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-background border-l border-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-card/50">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-bold">
                  Your Cart{" "}
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
                aria-label="Close cart"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Locked Bundle Notice */}
            {isLockedBundle && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-2.5 flex items-center justify-between text-xs text-amber-500 dark:text-amber-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  Exclusive Offer Bundle locked at special price
                </span>
                <button
                  onClick={clearCart}
                  className="underline hover:text-amber-300 transition-colors ml-2 shrink-0"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 opacity-20" />
                  <p className="text-sm font-medium">Your cart is empty</p>
                  <p className="text-xs text-center max-w-[220px]">
                    Browse courses or click our exclusive offer banner to add a bundle!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((course) => {
                    const isPartOfLockedBundle =
                      isLockedBundle &&
                      matchedOffer &&
                      matchedOffer.courseIds.includes(course.id);

                    return (
                      <div
                        key={course.id}
                        className={`flex items-start gap-3 p-3 rounded-xl bg-card border ${
                          isPartOfLockedBundle
                            ? "border-amber-500/30 bg-amber-500/[0.02]"
                            : "border-border"
                        }`}
                      >
                        <CartItemThumbnail src={course.thumbnail} title={course.title} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-tight line-clamp-2">
                            {course.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-bold text-primary">₹{course.price}</span>
                            {isPartOfLockedBundle && (
                              <span className="text-[10px] bg-amber-500/15 text-amber-500 px-1.5 py-0.2 rounded font-semibold">
                                Bundle Item
                              </span>
                            )}
                          </div>
                        </div>

                        {/* If part of locked exclusive offer, user cannot remove individually */}
                        {isPartOfLockedBundle ? (
                          <div
                            className="p-1.5 text-muted-foreground/50 flex-shrink-0"
                            title="Part of Exclusive Offer Bundle (cannot be removed individually)"
                          >
                            <Lock className="h-4 w-4 text-amber-500/80" />
                          </div>
                        ) : (
                          <button
                            onClick={() => removeFromCart(course.id)}
                            className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                            title="Remove from cart"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Checking bundle offers */}
                  {offersLoading && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground p-3">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Checking active bundle offers…
                    </div>
                  )}

                  {/* Prominent Matched Bundle Offer Deal Box */}
                  {!offersLoading && matchedOffer && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10 border border-green-500/30 shadow-sm space-y-2 mt-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wide">
                          <Sparkles className="h-3.5 w-3.5 text-green-500 animate-pulse" />
                          Exclusive Offer Applied
                        </span>
                        <span className="text-xs font-extrabold bg-green-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                          {savingsPct}% PROFIT / SAVINGS
                        </span>
                      </div>

                      {matchedOffer.title ? (
                        <p className="text-sm font-bold text-foreground">{matchedOffer.title}</p>
                      ) : (
                        <p className="text-sm font-bold text-foreground">Exclusive Bundle Deal</p>
                      )}

                      <div className="text-xs text-muted-foreground space-y-1 pt-1">
                        <div className="flex justify-between">
                          <span>Individual courses total:</span>
                          <span className="line-through">₹{originalTotal}</span>
                        </div>
                        <div className="flex justify-between text-green-600 dark:text-green-400 font-bold">
                          <span>Exclusive bundle price:</span>
                          <span>₹{totalPrice}</span>
                        </div>
                        <div className="flex justify-between text-green-600 dark:text-green-400 font-bold text-sm pt-1 border-t border-green-500/20">
                          <span>Total profit/savings:</span>
                          <span>₹{savings} ({savingsPct}% OFF)</span>
                        </div>
                      </div>

                      {isLockedBundle && (
                        <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1 pt-1">
                          <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                          Bundled together at default offer price.
                        </p>
                      )}
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {cartItems.length > 0 && (
              <div className="p-5 border-t border-border space-y-4 bg-card/40">
                {/* Price breakdown */}
                {matchedOffer && (
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Total Value ({cartCount} courses)</span>
                      <span className="line-through">₹{originalTotal}</span>
                    </div>
                    <div className="flex justify-between text-green-600 dark:text-green-400 font-bold">
                      <span>Bundle Discount ({savingsPct}% savings)</span>
                      <span>-₹{savings}</span>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground font-medium block">Total to Pay</span>
                    <span className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">
                      ₹{totalPrice}
                    </span>
                  </div>
                  {savings > 0 && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-green-600 dark:text-green-400 tracking-wider block">
                        You Profit
                      </span>
                      <span className="text-sm font-extrabold text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                        Save ₹{savings}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full text-base py-6 font-bold shadow-lg shadow-primary/20"
                  size="lg"
                  onClick={() => onCheckout(totalPrice, matchedOffer)}
                >
                  Proceed to Checkout <ArrowRight className="h-4 w-4 ml-2" />
                </Button>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Lifetime access</span>
                  <span>Instant access to all {cartCount} courses</span>
                </div>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

function CartItemThumbnail({ src, title }: { src?: string; title: string }) {
  const [hasError, setHasError] = useState(false);
  if (!src || hasError) {
    return (
      <div className="h-14 w-14 rounded-lg bg-secondary/80 border border-border flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground select-none">
        {title.trim().charAt(0).toUpperCase() || "📚"}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={title}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
      className="h-14 w-14 rounded-lg object-contain bg-secondary/60 flex-shrink-0"
    />
  );
}
