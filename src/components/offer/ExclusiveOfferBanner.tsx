import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, ShoppingCart, ArrowRight, Lock, Percent, CheckCircle2, ChevronDown } from "lucide-react";
import { getActiveBannerOffer, type BundleOffer } from "@/lib/bundle-offers";
import { useCart } from "@/features/cart/use-cart";
import { useAuth } from "@/features/auth/use-auth";
import { hasCourseAccess } from "@/services/access/access";
import { checkFirestoreAccess } from "@/services/access/access";
import type { Course } from "@/services/database/firebase-courses";

interface ExclusiveOfferBannerProps {
  allCourses: Course[];
  onOpenCart: () => void;
  className?: string;
}

/**
 * Hook to check if user has access to ALL courses in a bundle.
 * Returns { allAccessed, accessedIds, loading }
 */
function useBundleAccessCheck(courseIds: string[]) {
  const { user, loading: authLoading } = useAuth();
  const [accessedIds, setAccessedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || courseIds.length === 0) {
      setLoading(authLoading);
      return;
    }

    let cancelled = false;

    const checkAll = async () => {
      setLoading(true);
      const accessed = new Set<string>();

      for (const courseId of courseIds) {
        // Check localStorage first (fast)
        if (hasCourseAccess(courseId)) {
          accessed.add(courseId);
          continue;
        }
        // Check Firestore for logged-in users
        if (user?.uid) {
          try {
            const result = await checkFirestoreAccess(user.uid, courseId);
            if (result) accessed.add(courseId);
          } catch {
            // ignore
          }
        }
      }

      if (!cancelled) {
        setAccessedIds(accessed);
        setLoading(false);
      }
    };

    checkAll();
    return () => { cancelled = true; };
  }, [courseIds.join(","), user?.uid, authLoading]);

  // Listen for access change events
  useEffect(() => {
    if (courseIds.length === 0) return;

    const handlers: Array<() => void> = [];
    for (const courseId of courseIds) {
      const event = `course-access-changed-${courseId}`;
      const handler = () => {
        if (hasCourseAccess(courseId)) {
          setAccessedIds((prev) => new Set([...prev, courseId]));
        }
      };
      window.addEventListener(event, handler);
      handlers.push(() => window.removeEventListener(event, handler));
    }
    return () => handlers.forEach((h) => h());
  }, [courseIds.join(",")]);

  const allAccessed = courseIds.length > 0 && courseIds.every((id) => accessedIds.has(id));

  return { allAccessed, accessedIds, loading };
}

export function ExclusiveOfferBanner({
  allCourses,
  onOpenCart,
  className = "",
}: ExclusiveOfferBannerProps) {
  const { setBundleCart } = useCart();

  const { data: offer } = useQuery<BundleOffer | null>({
    queryKey: ["active-banner-offer"],
    queryFn: getActiveBannerOffer,
    staleTime: 60 * 1000,
  });

  const bundledCourses = useMemo(() => {
    if (!offer || !offer.courseIds || offer.courseIds.length === 0) return [];
    return allCourses.filter((c) => offer.courseIds.includes(c.id));
  }, [offer, allCourses]);

  const bundleCourseIds = useMemo(
    () => bundledCourses.map((c) => c.id),
    [bundledCourses]
  );

  const { allAccessed, loading: accessLoading } = useBundleAccessCheck(bundleCourseIds);

  if (!offer || !offer.active || bundledCourses.length === 0) {
    return null;
  }

  // ── User already owns ALL bundle courses → show congratulations, hide the offer ──
  if (allAccessed && !accessLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`w-full max-w-4xl mx-auto ${className}`}
      >
        <div className="relative overflow-hidden rounded-2xl border-2 border-green-500/50 bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-green-500/10 shadow-lg shadow-green-500/10 p-1">
          <div className="rounded-2xl bg-card/95 backdrop-blur-md p-6 sm:p-8">
            {/* Success Icon + Heading */}
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-green-500/15 border-2 border-green-500/30">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>

              <div className="space-y-2 max-w-lg">
                <h3 className="font-display text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                  🎉 Congratulations! Bundle Unlocked
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  You have accessed all{" "}
                  <strong className="text-green-600 dark:text-green-400">
                    {bundledCourses.length} courses
                  </strong>{" "}
                  from this bundle. Scroll down to see your unlocked courses — look for the{" "}
                  <span className="inline-flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                    Access Course
                  </span>{" "}
                  button on each one.
                </p>
              </div>

              {/* Course chips */}
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {bundledCourses.map((course) => (
                  <span
                    key={course.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/30 px-3 py-1 text-xs font-semibold text-green-600 dark:text-green-400"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {course.title}
                  </span>
                ))}
              </div>

              {/* Scroll hint */}
              <button
                onClick={() => {
                  document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="mt-2 flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-sm sm:text-base font-bold shadow-lg shadow-green-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <span>Access Your Courses</span>
                <ChevronDown className="h-4 w-4 animate-bounce" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  const individualTotal = bundledCourses.reduce((sum, c) => sum + (c.price || 0), 0);
  const bundlePrice = offer.bundlePrice;
  const savings = Math.max(0, individualTotal - bundlePrice);
  const savingsPct =
    individualTotal > 0 ? Math.round((savings / individualTotal) * 100) : 0;

  const handleBannerClick = () => {
    // 1. Populate cart with all bundled courses locked at this offer ID
    setBundleCart(bundledCourses, offer.id);
    // 2. Open Cart Drawer to show savings, profit %, and locked courses
    onOpenCart();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`w-full max-w-4xl mx-auto cursor-pointer group ${className}`}
      onClick={handleBannerClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleBannerClick();
        }
      }}
      aria-label={
        offer.title
          ? `Exclusive Offer: ${offer.title}. Click to view in cart with ${savingsPct}% profit`
          : `Exclusive Course Bundle. Click to view in cart with ${savingsPct}% profit`
      }
    >
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 p-[1px] shadow-lg shadow-amber-500/10 transition-all duration-300 group-hover:scale-[1.01] group-hover:shadow-xl group-hover:shadow-amber-500/20 group-hover:border-amber-400">
        {/* Glow backlight */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100 -z-10" />

        <div className="relative overflow-hidden rounded-2xl bg-card/95 backdrop-blur-md">
          {offer.imageUrl ? (
            /* ── Image-based Rectangular Banner ── */
            <div className="relative w-full overflow-hidden rounded-2xl">
              <img
                src={offer.imageUrl}
                alt={offer.title || "Exclusive Offer Banner"}
                className="w-full h-auto max-h-[360px] object-cover transition-transform duration-500 ease-out group-hover:scale-[1.015]"
                loading="eager"
                decoding="async"
              />

              {/* If title or subtitle was explicitly provided, show a sleek text overlay */}
              {offer.title ? (
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-between p-4 sm:p-6 md:p-8">
                  {/* Top Badge Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-[11px] sm:text-xs font-black uppercase tracking-wider text-black shadow-md">
                      <Sparkles className="h-3 w-3 fill-black text-black animate-pulse" />
                      Exclusive Offer
                    </span>
                    {savingsPct > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-1 text-[11px] sm:text-xs font-black text-white shadow-md">
                        <Percent className="h-3 w-3" />
                        {savingsPct}% PROFIT / SAVINGS
                      </span>
                    )}
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-white/80 bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-sm">
                      <Lock className="h-3 w-3 text-amber-400" />
                      {bundledCourses.length} Courses Bundled
                    </span>
                  </div>

                  {/* Bottom Content Row */}
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2">
                    <div className="max-w-lg">
                      <h3 className="font-display text-lg sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight drop-shadow-md line-clamp-1 sm:line-clamp-2">
                        {offer.title}
                      </h3>
                      {offer.subtitle && (
                        <p className="mt-1 text-xs sm:text-sm text-white/90 line-clamp-1 drop-shadow-sm font-medium">
                          {offer.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Price & CTA Button */}
                    <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto bg-black/50 backdrop-blur-md p-2 sm:p-2.5 rounded-xl border border-white/20">
                      <div className="text-right">
                        {individualTotal > bundlePrice && (
                          <p className="text-[11px] text-white/60 line-through font-semibold leading-none">
                            ₹{individualTotal}
                          </p>
                        )}
                        <p className="font-display text-lg sm:text-2xl font-black text-amber-400 leading-tight">
                          ₹{bundlePrice}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-2 text-xs sm:text-sm font-black text-black shadow-md transition-all group-hover:from-amber-400 group-hover:to-orange-400 group-hover:shadow-amber-500/30">
                        <span>Get All in Cart</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Pure Clean Image Banner (No title blocking the graphic design) ── */
                <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 flex items-center gap-2">
                  {savingsPct > 0 && (
                    <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-green-500/95 backdrop-blur-md px-3 py-1.5 text-xs font-black text-white shadow-lg border border-green-400/40">
                      <Percent className="h-3.5 w-3.5" />
                      {savingsPct}% PROFIT
                    </span>
                  )}
                  <div className="flex items-center gap-2 rounded-xl bg-black/80 backdrop-blur-md px-3.5 py-2 text-xs sm:text-sm font-bold text-white border border-white/20 shadow-xl transition-all group-hover:bg-amber-500 group-hover:text-black group-hover:border-amber-400">
                    <ShoppingCart className="h-4 w-4" />
                    <span>View Deal in Cart</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Stylized Graphical Rectangular Banner (if no custom image uploaded) ── */
            <div className="relative p-5 sm:p-6 md:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <Sparkles className="h-3.5 w-3.5 fill-current" />
                    Exclusive Course Bundle
                  </span>
                  {savingsPct > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 border border-green-500/30 px-2.5 py-1 text-xs font-extrabold text-green-600 dark:text-green-400">
                      <Percent className="h-3 w-3" />
                      {savingsPct}% PROFIT / SAVINGS
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <Lock className="h-3 w-3 text-amber-500" />
                    {bundledCourses.length} Courses Locked
                  </span>
                </div>

                <h3 className="font-display text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                  {offer.title || "Special Course Bundle"}
                </h3>

                {offer.subtitle ? (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {offer.subtitle}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Get full lifetime access to {bundledCourses.map((c) => c.title).slice(0, 3).join(", ")}
                    {bundledCourses.length > 3 ? ` and ${bundledCourses.length - 3} more` : ""} bundled together!
                  </p>
                )}
              </div>

              {/* Price & Action */}
              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-border">
                <div className="text-left md:text-right">
                  {individualTotal > bundlePrice && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="line-through">₹{individualTotal}</span>
                      <span className="text-green-600 dark:text-green-400 font-bold">
                        Save ₹{savings}
                      </span>
                    </div>
                  )}
                  <div className="font-display text-2xl sm:text-3xl font-black text-primary">
                    ₹{bundlePrice}
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition-all group-hover:scale-105 group-hover:from-amber-400 group-hover:to-orange-400">
                  <ShoppingCart className="h-4 w-4" />
                  <span>Check Offer in Cart</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
