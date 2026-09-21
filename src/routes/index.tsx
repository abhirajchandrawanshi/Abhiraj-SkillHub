import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  LockKeyhole,
  Menu,
  X,
  Loader2,
  ChevronDown,
  Star,
  ArrowRight,
  Linkedin,
  Github,
  Youtube,
  LogOut,
  ShoppingBag,
  Plus,
  Check,
  Instagram,
  Facebook,
  Send,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SparklesCore } from "@/components/ui/sparkles";
import KineticGrid from "@/components/ui/kinetic-grid";

import { Button } from "@/components/ui/button";
import { GradientButton } from "@/components/ui/gradient-button";
import { SpinningBorderButton } from "@/components/ui/spinning-border-button";
import { BorderBeam } from "@/components/ui/border-beam";
import { CheckoutDialog } from "@/components/course/CheckoutDialog";
import { CartDrawer } from "@/components/course/CartDrawer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useCart, CartProvider } from "@/features/cart/use-cart";
import { useDynamicCourseAccess } from "@/features/courses/use-dynamic-course-access";
import type { CourseAccess } from "@/services/access/access";
import { readCourseAccess } from "@/services/access/access";
import { useQuery } from "@tanstack/react-query";
import { getPublishedCourses } from "@/services/database/firebase-courses";
import type { Course } from "@/services/database/firebase-courses";
import { createSignedPdfUrl } from "@/services/storage/supabase-server";
import type { BundleOffer } from "@/lib/bundle-offers";

const SITE_TITLE = "Skillearn";

export const Route = createFileRoute("/")(({
  head: () => ({
    meta: [
      { title: `${SITE_TITLE} | An investment in a career always pays back.` },
      { name: "description", content: "Industry-relevant courses, created by experts, to help you build real skills and achieve your goals." },
    ],
  }),
  component: () => (
    <CartProvider>
      <Landing />
    </CartProvider>
  ),
} as any));

// --- Rating persistence helpers ---
function getRatingKey(courseId: string) {
  return `course-rating:${courseId}`;
}

function saveRating(courseId: string, rating: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getRatingKey(courseId), String(rating));
}

function loadRating(courseId: string): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(getRatingKey(courseId));
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : 0;
}

// ─── Realistic growth & fluctuation helpers ─────────────────────────────────

/** Deterministic pseudo-random in [0, 1) from any integer seed. */
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

/** Simple string → integer hash for stable course-specific seeds. */
function strHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h);
}

/**
 * Returns a displayed rating count that grows asymptotically from the
 * publishedDate toward the stored target:
 *   day 1 ≈ 25%  |  day 2 ≈ 50%  |  day 3 ≈ 70%  |  day 5 ≈ 85%  |  day 7+ ≈ 95%
 * Each day has tiny seeded noise so it doesn't look frozen.
 */
function growingRatingCount(target: number, publishedDateStr: string, courseId: string): number {
  if (!target) return 0;
  let pubDate: Date;
  try {
    pubDate = new Date(publishedDateStr);
    if (isNaN(pubDate.getTime())) throw new Error();
  } catch {
    pubDate = new Date(); // fallback: treat as published today
  }
  const days = Math.max(0, Math.floor((Date.now() - pubDate.getTime()) / 86_400_000));
  // Asymptotic curve: 1 - 0.75^days  →  25%, 44%, 58%, 68%, 76% …
  // Boosted slightly to match the user's intuition of faster early growth:
  // We blend two curves so day1≈25%, day2≈50%, day3≈70%, day7≈95%
  const slow = 1 - Math.pow(0.75, days);        // gentle base
  const fast = 1 - Math.pow(0.5, days * 0.6);   // faster start
  const t = Math.min(1, days / 14);              // blend shifts toward slow after ~2 weeks
  const base = slow * t + fast * (1 - t);
  const seed = strHash(courseId);
  const noise = (seededRandom(seed + days * 7) - 0.5) * 0.04; // ±2% daily jitter
  const factor = Math.min(0.99, Math.max(0.05, base + noise));
  return Math.round(target * factor);
}

/**
 * Returns the display rating (stars) fluctuating ±0.1 each calendar day,
 * deterministically seeded so all viewers see the same value on the same day.
 */
function fluctuatingRating(base: number, courseId: string): number {
  const seed = strHash(courseId);
  const today = new Date();
  // Day-of-year * prime gives a different seed per day
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  const rand = seededRandom(seed + dayOfYear * 137);
  const delta = (rand - 0.5) * 0.2; // range: -0.1 … +0.1
  return Math.min(5, Math.max(0, base + delta));
}

// ─────────────────────────────────────────────────────────────────────────────

// --- CourseCard (horizontal list layout) ---
function CourseCard({
  course,
  onEnroll,
  index,
}: {
  course: Course;
  onEnroll: (courseId: string) => void;
  index: number;
}) {
  const { user } = useAuth();
  const { access: courseAccess, loading: accessLoading } = useDynamicCourseAccess(course.id);
  const { addToCart, removeFromCart, isInCart } = useCart();
  const [pdfLoading, setPdfLoading] = useState(false);

  // Persistent rating state — loaded from localStorage on mount
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [hasRated, setHasRated] = useState(false);

  useEffect(() => {
    const saved = loadRating(course.id);
    if (saved > 0) {
      setUserRating(saved);
      setHasRated(true);
    }
  }, [course.id]);

  const handleCourseAccess = async () => {
    if (courseAccess) {
      if (course.pdfPath) {
        setPdfLoading(true);
        try {
          const userId = user?.uid || readCourseAccess(course.id)?.userId || readCourseAccess(course.id)?.email || "";
          if (!userId) {
            alert("Unable to verify your identity. Please log in and try again.");
            return;
          }
          const result = await createSignedPdfUrl({
            data: {
              courseId: course.id,
              pdfPath: course.pdfPath,
              userId,
            },
          });
          window.open(result.signedUrl, "_blank");
        } catch (err) {
          alert(err instanceof Error ? err.message : "Failed to access the PDF. Please try again.");
        } finally {
          setPdfLoading(false);
        }
        return;
      }
      if (course.resources && course.resources.length > 0) {
        const firstUrl = course.resources[0].url;
        if (firstUrl) {
          window.open(firstUrl, "_blank");
          return;
        }
      }
      if (course.accessInfo && (course.accessInfo.startsWith("http") || course.accessInfo.startsWith("/"))) {
        window.open(course.accessInfo, "_blank");
      } else {
        alert(course.accessInfo ? `Access info: ${course.accessInfo}` : `You have access to ${course.title}! Check your email for more details.`);
      }
    } else {
      onEnroll(course.id);
    }
  };

  const handleRate = (rating: number) => {
    setUserRating(rating);
    setHasRated(true);
    saveRating(course.id, rating);
  };

  const inCart = isInCart(course.id);

  const baseRating = course.rating || 4.8;
  const baseCount  = course.ratingCount || 1200;

  // Grow the displayed count from publishedDate toward the stored target
  const displayedCount = course.publishedDate
    ? growingRatingCount(baseCount, course.publishedDate, course.id)
    : baseCount;

  // Fluctuate rating ±0.1 deterministically each calendar day
  const rating = fluctuatingRating(baseRating, course.id);

  const formattedRatingCount = displayedCount >= 1000
    ? (displayedCount / 1000).toFixed(1) + "K"
    : displayedCount.toString();

  const publishedDate = course.publishedDate
    ? new Date(course.publishedDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "Aug 2024";

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      className="group flex flex-col sm:flex-row overflow-hidden rounded-2xl bg-card border border-border shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300"
    >
      {/* ── LEFT: Thumbnail ── */}
      <div className="w-full sm:w-64 md:w-72 lg:w-80 flex-shrink-0 overflow-hidden bg-secondary min-h-[200px] sm:min-h-[220px]">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="h-full w-full object-cover min-h-[200px] sm:min-h-[220px] group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="h-full min-h-[200px] sm:min-h-[220px] w-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <span className="text-4xl">📚</span>
          </div>
        )}
      </div>

      {/* ── RIGHT: Details ── */}
      <div className="flex flex-1 flex-col p-5 sm:p-6 gap-2.5">



        {/* ── Row 2: Title (left) + Published Date (right) ── */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-xl sm:text-2xl font-bold leading-snug text-foreground">
            {course.title}
          </h3>
          <span className="shrink-0 whitespace-nowrap rounded-md bg-primary/15 border border-primary/30 px-2.5 py-1 text-sm font-semibold text-primary">
            {publishedDate}
          </span>
        </div>

        {/* ── Row 3: Subtitle ── */}
        {course.subtitle && (
          <p className="text-base font-medium text-foreground/90 leading-snug line-clamp-2">
            {course.subtitle}
          </p>
        )}

        {/* ── Row 4: Description ── */}
        {course.description && (
          <p className="text-base text-muted-foreground line-clamp-2 leading-relaxed">
            {course.description}
          </p>
        )}

        {/* ── Row 5: Rating & Reviews ── */}
        <div className="flex items-center flex-wrap gap-3 text-sm pt-0.5">
          <div className="flex items-center gap-1 font-semibold text-amber-500">
            <Star className="h-4 w-4 fill-amber-500" />
            <span>{rating.toFixed(1)}</span>
            <span className="text-muted-foreground font-normal text-xs">({formattedRatingCount} reviews)</span>
          </div>
        </div>

        <div className="flex-1" />

        {/* ── Row 6: Price + Actions ── */}
        <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {/* Price */}
          <div className="flex items-baseline gap-2">
            {course.originalPrice && course.originalPrice > course.price && (
              <span className="text-sm text-muted-foreground line-through">₹{course.originalPrice}</span>
            )}
            <span className="font-display text-2xl font-bold text-foreground">₹{course.price}</span>
            {course.originalPrice && course.originalPrice > course.price && (
              <span className="text-xs font-semibold text-green-500 bg-green-500/10 rounded-full px-2 py-0.5">
                {Math.round((1 - course.price / course.originalPrice) * 100)}% off
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 sm:ml-auto">
            {courseAccess ? (
              <Button
                onClick={handleCourseAccess}
                disabled={accessLoading || pdfLoading}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-6 transition-transform hover:scale-105 active:scale-95 shadow-sm"
              >
                {accessLoading || pdfLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Access Course"
                )}
              </Button>
            ) : (
              <>
                <SpinningBorderButton
                  onClick={handleCourseAccess}
                  disabled={accessLoading}
                  className="transition-transform hover:scale-105 active:scale-95 shadow-sm"
                >
                  {accessLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Buy Now"
                  )}
                </SpinningBorderButton>
                <Button
                  onClick={() => inCart ? removeFromCart(course.id) : addToCart(course)}
                  variant={inCart ? "secondary" : "outline"}
                  size="sm"
                  className="px-3 rounded-lg transition-all hover:scale-105 active:scale-95 shadow-sm"
                  title={inCart ? "Remove from cart" : "Add to cart"}
                >
                  {inCart ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Feedback Rating (enrolled users only) */}
        {courseAccess && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex flex-col sm:flex-row sm:items-center gap-2 bg-secondary/50 p-3 rounded-lg border border-border"
            >
              {hasRated ? (
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                  ✓ Thanks for your feedback! (You rated {userRating}★)
                </motion.div>
              ) : (
                <>
                  <span className="text-xs font-semibold text-muted-foreground">Rate this course:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRate(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-5 w-5 ${star <= (hoverRating || userRating)
                              ? "fill-amber-500 text-amber-500"
                              : "text-muted-foreground/40"
                            }`}
                        />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

    </motion.div>
  );
}



function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOutUser } = useAuth();
  const { cartCount } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { isDark } = useTheme();

  // Single-course Buy Now checkout state
  const [checkoutCourseId, setCheckoutCourseId] = useState("");

  // Cart checkout state
  const [cartCheckoutCourses, setCartCheckoutCourses] = useState<Course[]>([]);
  const [cartCheckoutOffer, setCartCheckoutOffer] = useState<BundleOffer | null>(null);
  const [isCartCheckout, setIsCartCheckout] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // --- Search ---
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (val: string) => {
    setSearchQuery(val);
    if (val.trim()) {
      // auto-scroll into courses when user starts searching
      document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const clearSearch = () => setSearchQuery("");

  // Sort state
  const [sortType, setSortType] = useState<"latest" | "popular">("latest");

  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ["published-courses"],
    queryFn: async () => {
      if (typeof window === 'undefined') {
        return { courses: [] };
      }
      const result = await getPublishedCourses();
      return { courses: result };
    },
    enabled: typeof window !== 'undefined',
  });

  // Sort courses
  const dynamicCourses = [...(coursesData?.courses || [])].sort((a, b) => {
    if (sortType === "popular") {
      const countA = a.ratingCount || 1200;
      const countB = b.ratingCount || 1200;
      if (countA !== countB) return countB - countA;
    }

    const dateA = a.publishedDate || (typeof a.createdAt === 'string' ? a.createdAt : a.createdAt?.toDate?.().toISOString?.() ?? "");
    const dateB = b.publishedDate || (typeof b.createdAt === 'string' ? b.createdAt : b.createdAt?.toDate?.().toISOString?.() ?? "");
    return dateB.localeCompare(dateA);
  });

  // Filter by search query across all relevant text fields
  const filteredCourses = searchQuery.trim()
    ? dynamicCourses.filter((c) => {
      const q = searchQuery.toLowerCase();
      return (
        c.title?.toLowerCase().includes(q) ||
        c.subtitle?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.instructor?.toLowerCase().includes(q) ||
        c.accessInfo?.toLowerCase().includes(q)
      );
    })
    : dynamicCourses;

  // Track which nav section is active
  const [activeSection, setActiveSection] = useState<'home' | 'courses' | 'about'>('home');
  useEffect(() => {
    const onScroll = () => {
      const about = document.getElementById('about');
      const courses = document.getElementById('courses');
      const home = document.getElementById('home');
      // Use getBoundingClientRect for accurate position regardless of layout
      const aboutTop = about ? about.getBoundingClientRect().top : Infinity;
      const coursesTop = courses ? courses.getBoundingClientRect().top : Infinity;
      const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 20;

      if (isAtBottom || aboutTop <= window.innerHeight - 150) setActiveSection('about');
      else if (coursesTop <= 200) setActiveSection('courses');
      else setActiveSection('home');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const handlePaymentSuccess = () => {
    setCheckoutOpen(false);
    setIsCartCheckout(false);
    setCartCheckoutCourses([]);
    setCartCheckoutOffer(null);
  };

  // Single course Buy Now
  const handleDynamicCourseAccess = (courseId: string) => {
    setIsCartCheckout(false);
    setCheckoutCourseId(courseId);
    setCheckoutOpen(true);
  };

  // Cart checkout
  const handleCartCheckout = (totalPrice: number, matchedOffer: BundleOffer | null) => {
    // We don't need totalPrice here because CheckoutDialog computes it from courses
    setCartCheckoutOffer(matchedOffer);
    setIsCartCheckout(true);
    setCartDrawerOpen(false);
    setCheckoutOpen(true);
    // We'll pass cartItems directly via the state set in CartDrawer callback
  };

  const { cartItems } = useCart();

  const handleCartCheckoutFull = (totalPrice: number, offer: BundleOffer | null) => {
    setCartCheckoutCourses(cartItems);
    setCartCheckoutOffer(offer);
    setIsCartCheckout(true);
    setCartDrawerOpen(false);
    setCheckoutOpen(true);
  };

  // Checkout dialog props
  const singleCourse = dynamicCourses.find(c => c.id === checkoutCourseId);

  return (
    <KineticGrid isDark={isDark}>
      <header className="sticky top-0 z-50 py-4 border-b border-border/20 backdrop-blur-md" style={{ background: isDark ? 'rgba(22,22,24,0.80)' : 'rgba(248,249,251,0.80)' }}>
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6">
          <div className="flex items-center gap-10">
            <a href="#top" className="font-display text-2xl font-bold tracking-tight">
              Skillearn
            </a>
            <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
              <button
                onClick={() => scrollTo("home")}
                className={activeSection === 'home' ? "border-b-2 border-foreground pb-1 text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}
              >Home</button>
              <button
                onClick={() => scrollTo("courses")}
                className={activeSection === 'courses' ? "border-b-2 border-foreground pb-1 text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}
              >Courses</button>
              <button
                onClick={() => scrollTo("about")}
                className={activeSection === 'about' ? "border-b-2 border-foreground pb-1 text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}
              >About</button>
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <BorderBeam size="md" colorVariant="colorful" theme={isDark ? "dark" : "light"} className="rounded-full">
              <div className="relative rounded-full overflow-hidden bg-secondary border border-border/20 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && clearSearch()}
                  className="h-10 w-64 bg-transparent pl-10 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-all relative z-10"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </BorderBeam>

            {/* Cart button with badge */}
            <button
              className="text-foreground hover:text-muted-foreground relative"
              onClick={() => setCartDrawerOpen(true)}
              title="View cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-3">
                <button onClick={() => void navigate({ to: "/" })} className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold hover:opacity-90">
                  {user.email ? user.email.charAt(0).toUpperCase() : "AC"}
                </button>
                <button onClick={() => void signOutUser()} className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button onClick={() => void navigate({ to: "/login" })} className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold hover:opacity-90">
                <LockKeyhole className="h-4 w-4" />
              </button>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden sticky top-[73px] z-40 border-b border-border/20 backdrop-blur-xl"
            style={{ background: isDark ? 'rgba(22,22,24,0.95)' : 'rgba(248,249,251,0.95)' }}
          >
            <div className="flex flex-col p-6 gap-6">
              {/* Mobile Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && clearSearch()}
                  className="h-12 w-full rounded-xl bg-secondary pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Mobile Nav Links */}
              <nav className="flex flex-col gap-4 text-base font-semibold">
                <button onClick={() => scrollTo("home")} className={`text-left px-2 py-1 ${activeSection === 'home' ? 'text-foreground' : 'text-muted-foreground'}`}>Home</button>
                <button onClick={() => scrollTo("courses")} className={`text-left px-2 py-1 ${activeSection === 'courses' ? 'text-foreground' : 'text-muted-foreground'}`}>Courses</button>
                <button onClick={() => scrollTo("about")} className={`text-left px-2 py-1 ${activeSection === 'about' ? 'text-foreground' : 'text-muted-foreground'}`}>About</button>
              </nav>

              <div className="h-px bg-border/50 w-full" />

              {/* Mobile Footer Actions */}
              <div className="flex items-center justify-between px-2">
                <ThemeToggle />
                <div className="flex items-center gap-4">
                  <button
                    className="text-foreground relative p-2"
                    onClick={() => { setCartDrawerOpen(true); setMenuOpen(false); }}
                  >
                    <ShoppingCart className="h-6 w-6" />
                    {cartCount > 0 && (
                      <span className="absolute 1 top-0 right-0 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </button>

                  {user ? (
                    <button onClick={() => { void signOutUser(); setMenuOpen(false); }} className="text-muted-foreground hover:text-foreground flex items-center gap-2 font-medium">
                      <LogOut className="h-5 w-5" /> Logout
                    </button>
                  ) : (
                    <button onClick={() => { void navigate({ to: "/login" }); setMenuOpen(false); }} className="text-muted-foreground hover:text-foreground flex items-center gap-2 font-medium">
                      <LockKeyhole className="h-5 w-5" /> Login
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main id="top">
        {/* Hero Section */}
        <section id="home" className="relative overflow-hidden">
          <div className="mx-auto max-w-[1400px] px-6 relative w-full pt-20 pb-20 md:pt-32 md:pb-32">
            <div className="flex flex-col items-center text-center gap-10 md:gap-16">
              {/* Heading */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="max-w-4xl relative"
              >
                <p className="mb-6 text-sm font-bold tracking-[0.2em] uppercase" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(30,30,60,0.45)' }}>
                  Learn. Build. Grow.
                </p>
                <div className="relative">
                  <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.1] tracking-tight" style={{ color: isDark ? '#fff' : '#0f0f1a' }}>
                    An investment in a career <br className="hidden md:block"/>
                    <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">always pays back.</span>
                  </h1>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Dynamic Courses Section */}
        <section id="courses" className="pb-24 pt-6">
          <div className="mx-auto max-w-[1400px] px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <h2 className="font-display text-2xl font-bold text-foreground">
                {searchQuery.trim()
                  ? filteredCourses.length > 0
                    ? `${filteredCourses.length} result${filteredCourses.length === 1 ? '' : 's'} for "${searchQuery}"`
                    : `No results for "${searchQuery}"`
                  : 'All Courses'}
              </h2>

              <div className="flex items-center gap-3">
                {/* Cart summary button (if items in cart) */}
                {cartCount > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setCartDrawerOpen(true)}
                    className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-all hover:scale-105 active:scale-95 shadow-sm"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {cartCount} in cart
                  </motion.button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/50 transition-all hover:scale-105 active:scale-95 shadow-sm">
                      {sortType === "latest" ? "Latest" : "Most Popular"}
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortType("latest")}>
                      Latest
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortType("popular")}>
                      Most Popular
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>

            {!isMounted || coursesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : filteredCourses.length > 0 ? (
              <div className="flex flex-col gap-6">
                {filteredCourses.map((course, index) => (
                  <CourseCard key={course.id} course={course} onEnroll={handleDynamicCourseAccess} index={index} />
                ))}
              </div>
            ) : searchQuery.trim() ? (
              <div className="text-center py-16">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground font-medium">No courses match &ldquo;{searchQuery}&rdquo;</p>
                <p className="text-sm text-muted-foreground mt-1">Try a different keyword — course name, topic, or instructor</p>
                <button
                  onClick={clearSearch}
                  className="mt-4 text-sm text-primary hover:underline"
                >Clear search</button>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No courses available at the moment. Please check back later.
              </div>
            )}
          </div>
        </section>
      </main>

      <footer id="about" className="border-t border-border/30 pt-16 pb-14">
        <div className="mx-auto max-w-[1400px] px-6">

          {/* ── About blurb ── */}
          <div className="text-center mb-10">
            <span className="font-display text-3xl font-bold tracking-tight text-foreground">Skillearn</span>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              Built by <span className="font-semibold text-foreground">Abhiraj Chandrawanshi</span> — a developer &amp; educator making practical skills accessible to everyone.
            </p>
          </div>

          {/* ── Find me on heading ── */}
          <div className="text-center mb-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Find me{" "}
              <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">on</span>
            </h2>
          </div>

          {/* ── Social buttons — centered row with GradientButton ── */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-12">

            {/* Instagram */}
            <GradientButton asChild>
              <a
                href="https://www.instagram.com/abhis.club"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2.5 text-sm transition-transform duration-200 hover:-translate-y-1 active:scale-95"
              >
                <Instagram className="h-5 w-5" />
                @abhis.club
              </a>
            </GradientButton>

            {/* Telegram */}
            <GradientButton variant="variant" asChild>
              <a
                href="https://t.me/Avii_tech_family"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2.5 text-sm transition-transform duration-200 hover:-translate-y-1 active:scale-95"
              >
                <Send className="h-5 w-5" />
                Avii Tech Family
              </a>
            </GradientButton>

            {/* YouTube */}
            <GradientButton asChild>
              <a
                href="https://www.youtube.com/@abhis.club"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2.5 text-sm transition-transform duration-200 hover:-translate-y-1 active:scale-95"
              >
                <Youtube className="h-5 w-5" />
                YouTube Channel
              </a>
            </GradientButton>

            {/* Facebook */}
            <GradientButton variant="variant" asChild>
              <a
                href="https://www.facebook.com/share/1BtpMK2ij3/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2.5 text-sm transition-transform duration-200 hover:-translate-y-1 active:scale-95"
              >
                <Facebook className="h-5 w-5" />
                Facebook Page
              </a>
            </GradientButton>
          </div>

          {/* ── Bottom bar ── */}
          <div className="border-t border-border/30 pt-6 text-center">
            <span className="text-xs text-muted-foreground">© 2026 Skillearn by Abhiraj Chandrawanshi. All rights reserved.</span>
          </div>

        </div>
      </footer>


      {/* Cart Drawer */}
      <CartDrawer
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        onCheckout={handleCartCheckoutFull}
      />

      {/* Checkout Dialog — handles both single and multi-course */}
      {checkoutOpen && (
        <CheckoutDialog
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          // Single-course mode props
          accessInfo={!isCartCheckout ? (singleCourse?.details ?? "") : undefined}
          pdfPath={!isCartCheckout ? (singleCourse?.pdfPath || "") : undefined}
          price={!isCartCheckout ? (singleCourse ? singleCourse.price : 0) : undefined}
          title={!isCartCheckout ? (singleCourse ? singleCourse.title : "") : undefined}
          courseId={!isCartCheckout ? checkoutCourseId : undefined}
          resources={!isCartCheckout ? (singleCourse?.resources) : undefined}
          // Cart (multi-course) mode props
          courses={isCartCheckout ? cartCheckoutCourses : undefined}
          matchedOffer={isCartCheckout ? cartCheckoutOffer : undefined}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </KineticGrid>
  );
}
