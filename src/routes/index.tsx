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
  HelpCircle,
  ChevronUp,
  Phone,
  Mail,
  User,
  MessageSquare,
  ImageIcon,
  X as XIcon,
  Home,
  BookOpen,
  Info,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CheckoutDialog } from "@/components/course/CheckoutDialog";
import { CartDrawer } from "@/components/course/CartDrawer";
import { ExclusiveOfferBanner } from "@/components/offer/ExclusiveOfferBanner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FeedbackCard } from "@/components/ui/feedback-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/features/auth/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useCart, CartProvider } from "@/features/cart/use-cart";
import { useDynamicCourseAccess } from "@/features/courses/use-dynamic-course-access";
import type { CourseAccess } from "@/services/access/access";
import { readCourseAccess, hasCourseAccess } from "@/services/access/access";
import { getActiveBannerOffer } from "@/lib/bundle-offers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getUserProfile, updateUserNotificationPreference, updateUserProfileName } from "@/services/database/user-profile";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  submitCourseRating,
  submitSuggestion,
} from "@/services/database/firebase-courses";
import { sendSupportEmail } from "@/services/email/brevo";
import { getPublishedCoursesServer, getPrivateCourseAccessInfo } from "@/services/database/public-server";
import type { Course } from "@/services/database/firebase-courses";
import { createSignedPdfUrl } from "@/services/storage/supabase-server";
import type { BundleOffer } from "@/lib/bundle-offers";

const SITE_TITLE = "AbhiAcademy";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${SITE_TITLE} | An investment in a career always pays back.` },
      {
        name: "description",
        content:
          "Industry-relevant courses, created by experts, to help you build real skills and achieve your goals.",
      },
    ],
  }),
  component: () => (
    <CartProvider>
      <Landing />
    </CartProvider>
  ),
} as any);

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
 * course launch date toward the stored target:
 *   day 0 ≈  8%  |  day 1 ≈ 21%  |  day 2 ≈ 36%  |  day 3 ≈ 50%
 *   day 4 ≈ 69%  |  day 5 ≈ 85%  |  day 7+ → 95%+
 * Each day has tiny seeded noise so it doesn't look frozen.
 *
 * Priority for reference date: publishedDate → createdAt → fixed anchor (2024-08-01)
 * The function ALWAYS runs regardless of whether publishedDate exists.
 */
function growingRatingCount(
  target: number,
  publishedDateStr: string | undefined,
  courseId: string,
  createdAtStr?: string,
): number {
  if (!target) return 0;

  // Build an ordered list of candidate date strings to try
  const candidates = [
    publishedDateStr,
    createdAtStr,
    "2024-08-01", // Hard anchor: all courses are at least this old
  ];

  let pubDate: Date | null = null;
  for (const candidate of candidates) {
    if (!candidate) continue;
    const d = new Date(candidate);
    if (!isNaN(d.getTime())) {
      pubDate = d;
      break;
    }
  }

  // Should never be null due to the anchor, but be safe
  if (!pubDate) pubDate = new Date("2024-08-01");

  // Use a fixed reference date to avoid hydration mismatch
  // This ensures server and client render the same value
  const referenceDate = new Date("2024-11-01").getTime();
  const days = Math.max(0, Math.floor((referenceDate - pubDate.getTime()) / 86_400_000));

  const schedule = [0.08, 0.21, 0.36, 0.5, 0.69, 0.85];
  let base = 0;
  if (days < schedule.length) {
    base = schedule[days] || 0;
  } else {
    const extraDays = days - (schedule.length - 1);
    base = 0.85 + 0.15 * (1 - Math.pow(0.8, extraDays));
  }

  const seed = strHash(courseId);
  const noise = (seededRandom(seed + days * 7) - 0.5) * 0.04; // ±2% daily jitter
  const factor = Math.min(1.0, Math.max(0.05, base + noise));
  return Math.round(target * factor);
}

/**
 * Returns the display rating (stars) fluctuating ±0.1 each calendar day,
 * deterministically seeded so all viewers see the same value on the same day.
 */
function fluctuatingRating(base: number, courseId: string): number {
  const seed = strHash(courseId);
  // Use a fixed reference date to avoid hydration mismatch
  const fixedDate = new Date("2024-11-15");
  const dayOfYear = Math.floor(
    (fixedDate.getTime() - new Date(fixedDate.getFullYear(), 0, 0).getTime()) / 86_400_000,
  );

  // Deterministically jump forward in intervals of 1, 2, or 3 days
  let currentDay = 0;
  let fluctuationStep = 0;
  while (currentDay <= dayOfYear) {
    const interval = Math.floor(seededRandom(seed + fluctuationStep * 11) * 3) + 1; // 1 to 3
    if (currentDay + interval > dayOfYear) {
      break;
    }
    currentDay += interval;
    fluctuationStep++;
  }

  // Use the unique fluctuationStep to pick the delta
  const randMag = seededRandom(seed + fluctuationStep * 137);
  let magnitude = 0.1;
  if (randMag < 0.25) magnitude = 0.1;
  else if (randMag < 0.5) magnitude = 0.2;
  else if (randMag < 0.75) magnitude = 0.3;
  else magnitude = 0.4;

  const sign = seededRandom(seed + fluctuationStep * 331) > 0.5 ? 1 : -1;
  const delta = magnitude * sign;

  let raw = base + delta;
  raw = Math.round(raw * 10) / 10; // fix floating point precision
  return Math.min(5.0, Math.max(1.0, raw)); // Max 5.0
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [ratingFaded, setRatingFaded] = useState(false);

  useEffect(() => {
    const saved = loadRating(course.id);
    if (saved > 0) {
      setUserRating(saved);
      setHasRated(true);
      setRatingFaded(true); // Already rated previously, hide the message
    }
  }, [course.id]);

  // Auto-fade the "Thanks for your rating" message after 2 minutes
  useEffect(() => {
    if (hasRated && !ratingFaded) {
      const timer = setTimeout(() => {
        setRatingFaded(true);
      }, 120_000); // 2 minutes
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [hasRated, ratingFaded]);

  const handleCourseAccess = async () => {
    if (courseAccess) {
      // Now we fetch private resource info securely since it was stripped from public courses
      setPdfLoading(true);
      try {
        const userId =
          user?.uid ||
          readCourseAccess(course.id)?.userId ||
          readCourseAccess(course.id)?.email ||
          "";
          
        if (!userId) {
          alert("Unable to verify your identity. Please log in and try again.");
          setPdfLoading(false);
          return;
        }

        if (course.pdfPath) {
            const result = await createSignedPdfUrl({
              data: {
                courseId: course.id,
                pdfPath: course.pdfPath,
                userId,
              },
            });
            window.open(result.signedUrl, "_blank");
            setPdfLoading(false);
            return;
        }

        const privateInfo = await getPrivateCourseAccessInfo({
          data: { courseId: course.id, userId }
        });
        
        if (privateInfo.resources && privateInfo.resources.length > 0) {
          const firstUrl = privateInfo.resources[0].url;
          if (firstUrl) {
            window.open(firstUrl, "_blank");
            setPdfLoading(false);
            return;
          }
        }
        
        if (
          privateInfo.accessInfo &&
          (privateInfo.accessInfo.startsWith("http") || privateInfo.accessInfo.startsWith("/"))
        ) {
          window.open(privateInfo.accessInfo, "_blank");
        } else {
          alert(
            privateInfo.accessInfo
              ? `Access info: ${privateInfo.accessInfo}`
              : `You have access to ${course.title}! Check your email for more details.`,
          );
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to access course content. Please try again.");
      } finally {
        setPdfLoading(false);
      }
    } else {
      onEnroll(course.id);
    }
  };

  const handleRate = (rating: number) => {
    setUserRating(rating);
    setHasRated(true);
    saveRating(course.id, rating);
    submitCourseRating(course.id, rating, user?.uid);
  };

  const inCart = isInCart(course.id);

  const baseRating = course.rating || 4.8;
  const baseCount = course.ratingCount || 1200;

  // Resolve createdAt to a string for the growth function
  const createdAtStr =
    typeof course.createdAt === "string"
      ? course.createdAt
      : course.createdAt?.toDate?.().toISOString?.() ?? undefined;

  // Always run the growth formula — falls back to createdAt or anchor date if publishedDate is missing
  const displayedCount = growingRatingCount(baseCount, course.publishedDate, course.id, createdAtStr);

  // Fluctuate rating ±0.1 deterministically each calendar day
  const rating = fluctuatingRating(baseRating, course.id);

  const isFree = course.price === 0 || course.isFree === true;
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const formattedRatingCount = !isFree
    ? displayedCount >= 1000
      ? (displayedCount / 1000).toFixed(1) + "K"
      : displayedCount.toString()
    : null;

  // Use fixed date formatting to avoid hydration mismatch
  const publishedDate = course.publishedDate
    ? (() => {
        const date = new Date(course.publishedDate);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
      })()
    : "Aug 2024";

  return (
    <div className="group flex flex-col sm:flex-row overflow-hidden rounded-2xl bg-card border border-border shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300">
      {/* ── LEFT: Thumbnail ── */}
      <div className="w-full sm:w-64 md:w-72 lg:w-80 flex-shrink-0 bg-secondary/60 min-h-[200px] sm:min-h-[220px] flex items-center justify-center overflow-hidden">
        {course.thumbnail && !imageError ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            loading="lazy"
            decoding="async"
            crossOrigin="anonymous"
            onError={() => setImageError(true)}
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-contain min-h-[200px] sm:min-h-[220px] ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
            suppressHydrationWarning
          />
        ) : (
          <div className="h-full min-h-[200px] sm:min-h-[220px] w-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-primary/15 via-primary/5 to-secondary/30">
            <span className="text-4xl mb-2">🎓</span>
            <span className="text-sm font-semibold text-foreground/85 line-clamp-2 max-w-[90%]">
              {course.title}
            </span>
          </div>
        )}
      </div>

      {/* ── RIGHT: Details ── */}
      <div className="flex flex-1 flex-col p-5 sm:p-6 gap-2.5">
        {/* ── Row 2: Title (left) + Published Date (right) ── */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-xl sm:text-2xl font-bold leading-snug text-foreground whitespace-pre-line">
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
          <div className="flex flex-col items-start">
            <p
              className={`text-base text-muted-foreground leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}
            >
              {course.description}
            </p>
            {course.description.length > 100 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="mt-1 text-sm font-medium text-primary hover:underline focus:outline-none"
              >
                {isExpanded ? "Read less" : "Read more"}
              </button>
            )}
          </div>
        )}

        {/* ── Row 5: Rating & Reviews ── */}
        <div className="flex items-center flex-wrap gap-3 text-sm pt-0.5">
          <div className="flex items-center gap-1 font-semibold text-amber-500">
            <Star className="h-4 w-4 fill-amber-500" />
            <span>{rating.toFixed(1)}</span>
            {formattedRatingCount && (
              <span className="text-muted-foreground font-normal text-xs">
                ({formattedRatingCount} reviews)
              </span>
            )}
          </div>
        </div>

        <div className="flex-1" />

        {/* ── Row 6: Price + Actions ── */}
        <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {/* Price */}
          <div className="flex items-baseline gap-2">
            {course.originalPrice && course.originalPrice > course.price && (
              <span className="text-sm text-muted-foreground line-through">
                ₹{course.originalPrice}
              </span>
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
                <Button
                  onClick={handleCourseAccess}
                  disabled={accessLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground transition-transform hover:scale-105 active:scale-95 shadow-sm"
                >
                  {accessLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buy Now"}
                </Button>
                <Button
                  onClick={() => (inCart ? removeFromCart(course.id) : addToCart(course))}
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

        {/* Rating (enrolled users only, not for free courses) */}
        {courseAccess && !isFree && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-secondary/50 p-3 rounded-lg border border-border">
            {hasRated ? (
              <div className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                ✓ Thanks for your rating! (You rated {userRating}★)
              </div>
            ) : (
              <>
                <span className="text-xs font-semibold text-muted-foreground">
                  Rate this course:
                </span>
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
                        className={`h-5 w-5 ${
                          star <= (hoverRating || userRating)
                            ? "fill-amber-500 text-amber-500"
                            : "text-muted-foreground/40"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- FreeCourseCard (Flipkart-style compact grid card) ---
function FreeCourseCard({ course, index }: { course: Course; index: number }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleAccess = async () => {
    setLoading(true);
    try {
      const userId =
        user?.uid ||
        readCourseAccess(course.id)?.userId ||
        readCourseAccess(course.id)?.email ||
        "";
        
      if (!userId && !course.isFree && course.price > 0) {
        alert("Please login to access this course.");
        setLoading(false);
        return;
      }

      // Try PDF first
      if (course.pdfPath && userId) {
        const result = await createSignedPdfUrl({
          data: { courseId: course.id, pdfPath: course.pdfPath, userId },
        });
        window.open(result.signedUrl, "_blank");
        return;
      }
      
      // Fetch private data securely from the server.
      // Free courses bypass access verification on the server side, so we can
      // always call this — even for unauthenticated users — using "anonymous" as a placeholder.
      const effectiveUserId = userId || "anonymous";
      const privateInfo = await getPrivateCourseAccessInfo({
        data: { courseId: course.id, userId: effectiveUserId },
      });

      // Try resource links
      if (privateInfo.resources && privateInfo.resources.length > 0 && privateInfo.resources[0].url) {
        window.open(privateInfo.resources[0].url, "_blank");
        return;
      }
      
      // Try accessInfo URL
      if (
        privateInfo.accessInfo &&
        (privateInfo.accessInfo.startsWith("http") || privateInfo.accessInfo.startsWith("/"))
      ) {
        window.open(privateInfo.accessInfo, "_blank");
        return;
      }
      
      // Fallback
      if (privateInfo.accessInfo) {
        alert(`Access info: ${privateInfo.accessInfo}`);
      } else {
        alert(`${course.title} — content coming soon!`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to access this resource.");
    } finally {
      setLoading(false);
    }
  };

  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="group flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl rounded-2xl">
      {/* Thumbnail */}
      <div className="relative w-full aspect-[4/3] rounded-xl bg-secondary/60 mb-3 flex items-center justify-center overflow-hidden">
        {course.thumbnail && !imageError ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            loading="lazy"
            decoding="async"
            crossOrigin="anonymous"
            onError={() => setImageError(true)}
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-contain ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
            suppressHydrationWarning
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-green-500/15 to-emerald-500/5">
            <span className="text-4xl mb-1.5">📚</span>
            <span className="text-xs font-semibold text-foreground/80 line-clamp-2">
              {course.title}
            </span>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
      </div>

      {/* Title & subtitle */}
      <div className="flex flex-col items-center mt-2 px-2 text-center w-full">
        <div className="border border-foreground/50 rounded-lg px-3 py-2 w-full bg-background/80 backdrop-blur-sm flex items-center justify-center min-h-[3rem]">
          <h3 className="font-display text-base sm:text-lg lg:text-xl font-bold leading-tight text-foreground whitespace-pre-line">
            {course.title}
          </h3>
        </div>
        {course.subtitle && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-1.5">{course.subtitle}</p>
        )}
      </div>

      {/* Access button */}
      <div className="flex justify-center mt-4">
        <Button
          onClick={handleAccess}
          disabled={loading}
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-6 transition-transform hover:scale-105 active:scale-95 shadow-sm w-full max-w-[200px] cursor-pointer"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Access Course"}
        </Button>
      </div>
    </div>
  );
}

function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  // User Profile State
  const [userName, setUserName] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", user?.uid],
    queryFn: () => user?.uid ? getUserProfile(user.uid) : null,
    enabled: !!user?.uid,
    staleTime: 5 * 60 * 1000, // Cache profile for 5 minutes
  });

  useEffect(() => {
    if (userProfile && userProfile.name) {
      setUserName(userProfile.name);
    }
  }, [userProfile]);

  // --- Search ---
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (val: string) => {
    setSearchQuery(val);
    if (val.trim()) {
      // auto-scroll into courses when user starts searching
      document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const clearSearch = () => setSearchQuery("");

  // Tab state: 'free' | 'exclusive'
  const [activeTab, setActiveTab] = useState<"free" | "exclusive">("exclusive");

  // Sort state
  const [sortType, setSortType] = useState<"latest" | "popular">("latest");

  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ["published-courses"],
    queryFn: async () => {
      if (typeof window === "undefined") {
        return { courses: [] };
      }
      const result = await getPublishedCoursesServer();
      return { courses: result as Course[] };
    },
    enabled: typeof window !== "undefined",
    // Course catalog is semi-static: admin changes propagate within 5 minutes
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Sort courses
  const dynamicCourses = [...(coursesData?.courses || [])].sort((a, b) => {
    if (sortType === "popular") {
      const countA = a.ratingCount || 1200;
      const countB = b.ratingCount || 1200;
      if (countA !== countB) return countB - countA;
    }

    const dateA =
      a.publishedDate ||
      (typeof a.createdAt === "string"
        ? a.createdAt
        : (a.createdAt?.toDate?.().toISOString?.() ?? ""));
    const dateB =
      b.publishedDate ||
      (typeof b.createdAt === "string"
        ? b.createdAt
        : (b.createdAt?.toDate?.().toISOString?.() ?? ""));
    return dateB.localeCompare(dateA);
  });

  // Split into free (price === 0) and exclusive (price > 0)
  const freeCourses = dynamicCourses.filter((c) => c.price === 0 || c.isFree === true);
  const exclusiveCoursesUnsorted = dynamicCourses.filter((c) => c.price > 0 && c.isFree !== true);

  // Fetch the active banner offer to know which courses are part of the bundle
  const { data: bannerOffer } = useQuery({
    queryKey: ["active-banner-offer-landing"],
    queryFn: getActiveBannerOffer,
    staleTime: 60 * 1000,
  });

  // Track which exclusive courses the user has access to (for sorting accessed first)
  const [accessedCourseIds, setAccessedCourseIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (exclusiveCoursesUnsorted.length === 0) return;
    const accessed = new Set<string>();
    for (const c of exclusiveCoursesUnsorted) {
      if (hasCourseAccess(c.id)) {
        accessed.add(c.id);
      }
    }
    setAccessedCourseIds(accessed);

    // Listen for access changes on each course
    const handlers: Array<() => void> = [];
    for (const c of exclusiveCoursesUnsorted) {
      const event = `course-access-changed-${c.id}`;
      const handler = () => {
        if (hasCourseAccess(c.id)) {
          setAccessedCourseIds((prev) => new Set([...prev, c.id]));
        }
      };
      window.addEventListener(event, handler);
      handlers.push(() => window.removeEventListener(event, handler));
    }
    return () => handlers.forEach((h) => h());
  }, [exclusiveCoursesUnsorted.map((c) => c.id).join(",")]);

  // Sort: accessed courses first, then the rest
  const exclusiveCourses = [...exclusiveCoursesUnsorted].sort((a, b) => {
    const aAccessed = accessedCourseIds.has(a.id) ? 1 : 0;
    const bAccessed = accessedCourseIds.has(b.id) ? 1 : 0;
    return bAccessed - aAccessed; // accessed first
  });

  // Check if user has accessed all courses in the active bundle offer
  const bundleCourseIds = bannerOffer?.courseIds ?? [];
  const allBundleCoursesAccessed =
    bundleCourseIds.length > 0 &&
    bundleCourseIds.every((id) => accessedCourseIds.has(id));
  const accessedBundleCourses = allBundleCoursesAccessed
    ? exclusiveCourses.filter((c) => bundleCourseIds.includes(c.id))
    : [];

  // Apply search filter
  const applySearch = (courses: typeof dynamicCourses) =>
    searchQuery.trim()
      ? courses.filter((c) => {
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
      : courses;

  const filteredFree = applySearch(freeCourses);
  const filteredExclusive = applySearch(exclusiveCourses);

  // Keep filteredCourses for legacy search label
  const filteredCourses = applySearch(dynamicCourses);

  // Track which nav section is active
  const [activeSection, setActiveSection] = useState<"home" | "courses" | "help" | "about">("home");
  useEffect(() => {
    const onScroll = () => {
      const about = document.getElementById("about");
      const courses = document.getElementById("courses");
      const helpcenter = document.getElementById("helpcenter");
      const home = document.getElementById("home");
      const aboutTop = about ? about.getBoundingClientRect().top : Infinity;
      const coursesTop = courses ? courses.getBoundingClientRect().top : Infinity;
      const helpTop = helpcenter ? helpcenter.getBoundingClientRect().top : Infinity;
      const isAtBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 20;

      if (isAtBottom || aboutTop <= window.innerHeight - 150) setActiveSection("about");
      else if (helpTop <= 200) setActiveSection("help");
      else if (coursesTop <= 200) setActiveSection("courses");
      else setActiveSection("home");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
  const singleCourse = dynamicCourses.find((c) => c.id === checkoutCourseId);

  return (
    <>
      <header
        className="relative z-50 py-4 border-b border-border/20 backdrop-blur-md"
        style={{ background: isDark ? "rgba(22,22,24,0.80)" : "rgba(248,249,251,0.80)" }}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6">
          <div className="flex items-center gap-10">
            <span className="font-display text-2xl font-bold tracking-tight">AbhiAcademy</span>
            <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
              <button
                onClick={() => scrollTo("home")}
                className={`cursor-pointer ${activeSection === "home" ? "border-b-2 border-foreground pb-1 text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Home
              </button>
              <button
                onClick={() => scrollTo("courses")}
                className={`cursor-pointer ${activeSection === "courses" ? "border-b-2 border-foreground pb-1 text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Courses
              </button>
              <button
                onClick={() => scrollTo("helpcenter")}
                className={`cursor-pointer ${activeSection === "help" ? "border-b-2 border-foreground pb-1 text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Help Center
              </button>
              <button
                onClick={() => scrollTo("about")}
                className={`cursor-pointer ${activeSection === "about" ? "border-b-2 border-foreground pb-1 text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                About
              </button>
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="relative rounded-full overflow-hidden bg-secondary border border-border/20 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && clearSearch()}
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
              <button
                onClick={() => void navigate({ to: "/profile" })}
                className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold hover:opacity-90 focus:outline-none transition-opacity"
                title="Your Profile"
              >
                {userName ? userName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : "AC")}
              </button>
            ) : (
              <button
                onClick={() => void navigate({ to: "/login" })}
                className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold hover:opacity-90"
              >
                <LockKeyhole className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Mobile Right Controls: Prominent Menu + Direct Cart Access */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Direct Mobile Cart Button */}
            <button
              onClick={() => setCartDrawerOpen(true)}
              className="relative flex items-center justify-center p-2.5 rounded-xl bg-secondary/80 border border-border/50 text-foreground hover:bg-secondary active:scale-95 transition-all shadow-sm"
              title="View Cart"
              aria-label="View Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[11px] font-black flex items-center justify-center shadow-md">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Highly Prominent & Highlighted Mobile Menu Button */}
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 ${
                menuOpen
                  ? "bg-primary text-primary-foreground shadow-primary/30 ring-2 ring-primary/40"
                  : "bg-gradient-to-r from-primary/15 via-amber-500/15 to-primary/15 text-foreground border-2 border-primary/40 hover:border-primary shadow-primary/10"
              }`}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {menuOpen ? (
                <>
                  <X className="h-4 w-4 stroke-[3]" />
                  <span>Close</span>
                </>
              ) : (
                <>
                  <Menu className="h-4 w-4 text-primary stroke-[3]" />
                  <span className="font-extrabold text-foreground">Menu</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown (Rich, high-contrast & phone-friendly) */}
      {menuOpen && (
          <div className="md:hidden border-b border-border/40 bg-card/98 backdrop-blur-2xl shadow-2xl relative z-40">
            <div className="flex flex-col p-4 sm:p-5 gap-4 max-h-[85vh] overflow-y-auto">
              {/* Mobile Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && clearSearch()}
                  className="h-12 w-full rounded-xl bg-secondary/80 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Large, Finger-Friendly Navigation Cards */}
              <nav className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    scrollTo("home");
                    setMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left transition-all font-bold text-sm ${
                    activeSection === "home"
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-secondary/40 hover:bg-secondary text-foreground/90 border border-border/40"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Home className="h-4 w-4" />
                    </span>
                    <span>Home</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
                </button>

                <button
                  onClick={() => {
                    scrollTo("courses");
                    setMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left transition-all font-bold text-sm ${
                    activeSection === "courses"
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-secondary/40 hover:bg-secondary text-foreground/90 border border-border/40"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <span>Courses</span>
                  </span>
                  <span className="text-xs font-extrabold bg-amber-500/15 text-amber-500 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    Explore
                  </span>
                </button>

                <button
                  onClick={() => {
                    scrollTo("helpcenter");
                    setMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left transition-all font-bold text-sm ${
                    activeSection === "help"
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-secondary/40 hover:bg-secondary text-foreground/90 border border-border/40"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                      <HelpCircle className="h-4 w-4" />
                    </span>
                    <span>Help Center</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
                </button>

                <button
                  onClick={() => {
                    scrollTo("about");
                    setMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left transition-all font-bold text-sm ${
                    activeSection === "about"
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-secondary/40 hover:bg-secondary text-foreground/90 border border-border/40"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                      <Info className="h-4 w-4" />
                    </span>
                    <span>About Us</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
                </button>
              </nav>

              <div className="h-px bg-border/60 w-full my-1" />

              {/* User Account Section on Phone */}
              {user ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50">
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => {
                      void navigate({ to: "/profile" });
                      setMenuOpen(false);
                    }}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground font-black text-sm flex items-center justify-center shadow-md">
                      {userName ? userName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : "U")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        {userName || user.email?.split("@")[0]}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-medium">View Profile →</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      void signOutUser();
                      setMenuOpen(false);
                    }}
                    className="text-xs font-bold text-destructive hover:bg-destructive/10 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    void navigate({ to: "/login" });
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-black text-black shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                >
                  <LockKeyhole className="h-4 w-4" />
                  <span>Login / Sign In</span>
                </button>
              )}

              {/* Bottom Quick Controls (Theme) */}
              <div className="flex items-center justify-between pt-1">
                <ThemeToggle />
              </div>
            </div>
          </div>
        )}

      <main id="top">
        {/* Hero Section */}
        <section id="home" className="relative overflow-hidden">
          <div className="mx-auto max-w-[1400px] px-6 relative w-full pt-8 pb-16 md:pt-12 md:pb-28">
            <div className="flex flex-col items-center text-center gap-6 md:gap-10">
              {/* Exclusive Offer Banner placed in rectangle format between Navbar and Learn. Build. Grow. */}
              <div className="w-full flex justify-center">
                <ExclusiveOfferBanner
                  allCourses={coursesData?.courses ?? []}
                  onOpenCart={() => setCartDrawerOpen(true)}
                />
              </div>

              {/* Heading */}
              <div className="max-w-4xl relative">
                <p
                  className="mb-6 text-sm font-bold tracking-[0.2em] uppercase"
                  style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(30,30,60,0.45)" }}
                >
                  Learn. Build. Grow.
                </p>
                <div className="relative">
                  <h1
                    className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.1] tracking-tight"
                    style={{ color: isDark ? "#fff" : "#0f0f1a" }}
                  >
                    An investment in a career <br className="hidden md:block" />
                    <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                      always pays back.
                    </span>
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic Courses Section */}
        <section id="courses" className="pb-24 pt-6">
          <div className="mx-auto max-w-[1400px] px-6">
            {/* ── Tab Buttons + Controls Row ── */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Tab Switcher */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/60 border border-border/40 w-fit">
                <button
                  onClick={() => setActiveTab("exclusive")}
                  className={`cursor-pointer relative px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    activeTab === "exclusive"
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ⭐ Exclusive Courses
                  {exclusiveCourses.length > 0 && (
                    <span
                      className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${
                        activeTab === "exclusive"
                          ? "bg-white/20 text-white"
                          : "bg-amber-500/15 text-amber-600"
                      }`}
                    >
                      {exclusiveCourses.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("free")}
                  className={`cursor-pointer relative px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    activeTab === "free"
                      ? "bg-green-500 text-white shadow-md shadow-green-500/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🎁 Free Courses
                  {freeCourses.length > 0 && (
                    <span
                      className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${
                        activeTab === "free"
                          ? "bg-white/20 text-white"
                          : "bg-green-500/15 text-green-600"
                      }`}
                    >
                      {freeCourses.length}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-3">
                {/* Cart summary button (if items in cart) */}
                {cartCount > 0 && (
                  <button
                    onClick={() => setCartDrawerOpen(true)}
                    className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-all hover:scale-105 active:scale-95 shadow-sm"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {cartCount} in cart
                  </button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-10 px-4 text-sm font-medium">
                        {sortType === "latest" ? "Latest" : "Most Popular"}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
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
            </div>

            {/* ── Search result label ── */}
            {searchQuery.trim() && (
              <p className="mb-4 text-sm text-muted-foreground">
                {filteredCourses.length > 0
                  ? `${filteredCourses.length} result${filteredCourses.length === 1 ? "" : "s"} for "${searchQuery}"`
                  : `No results for "${searchQuery}"`}
              </p>
            )}

            {/* ── Course Lists ── */}
            {!isMounted || coursesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : activeTab === "free" ? (
              <div>
                {/* Free Courses Section Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-1 rounded-full bg-green-500" />
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground">
                      Free Courses
                    </h2>
                  </div>
                </div>
                {filteredFree.length > 0 ? (
                  <div className="grid grid-cols-1 min-[450px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
                    {filteredFree.map((course, index) => (
                      <FreeCourseCard key={course.id} course={course} index={index} />
                    ))}
                  </div>
                ) : searchQuery.trim() ? (
                  <div className="text-center py-16">
                    <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground font-medium">
                      No free courses match &ldquo;{searchQuery}&rdquo;
                    </p>
                    <button
                      onClick={clearSearch}
                      className="mt-4 text-sm text-primary hover:underline"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-16 rounded-2xl border border-dashed border-green-500/30 bg-green-500/5">
                    <span className="text-4xl mb-3 block">🎁</span>
                    <p className="text-muted-foreground font-medium">No free courses yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Check back soon — free content is coming!
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {/* Bundle Unlocked Congratulations Banner */}
                {allBundleCoursesAccessed && accessedBundleCourses.length > 0 && (
                  <div className="mb-8 rounded-2xl border-2 border-green-500/40 bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-green-500/10 p-5 sm:p-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-500/15 border border-green-500/30 flex-shrink-0">
                        <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                      </div>
                      <div className="space-y-1.5 min-w-0">
                        <h3 className="font-display text-base sm:text-lg font-extrabold text-green-700 dark:text-green-400">
                          🎉 You accessed all {accessedBundleCourses.length} courses in the bundle — Congratulations!
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Click on the{" "}
                          <span className="inline-flex items-center gap-1 bg-green-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">
                            Access Course
                          </span>{" "}
                          button below to open each course.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Exclusive Courses Section Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-1 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground">
                      Exclusive Courses
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Premium content crafted by industry experts
                    </p>
                  </div>
                </div>
                {filteredExclusive.length > 0 ? (
                  <div className="flex flex-col gap-6">
                    {filteredExclusive.map((course, index) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        onEnroll={handleDynamicCourseAccess}
                        index={index}
                      />
                    ))}
                  </div>
                ) : searchQuery.trim() ? (
                  <div className="text-center py-16">
                    <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground font-medium">
                      No exclusive courses match &ldquo;{searchQuery}&rdquo;
                    </p>
                    <button
                      onClick={clearSearch}
                      className="mt-4 text-sm text-primary hover:underline"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-16 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5">
                    <span className="text-4xl mb-3 block">⭐</span>
                    <p className="text-muted-foreground font-medium">
                      No exclusive courses yet
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Premium courses are being added soon!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ── Suggestion / Feedback Form ── */}
      <section className="border-t border-border/30 py-16 px-6 bg-secondary/10">
        <div className="mx-auto max-w-2xl text-center mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            Help Us Improve
          </h2>
          <p className="text-base font-semibold text-foreground mb-8">
            Your ideas shape what we build next. Got a suggestion? Let us know!
          </p>
          <FeedbackCard
            onSubmit={async (name, feedback) => {
              try {
                await submitSuggestion(name, feedback);
                toast.success("Thank you for your feedback!");
              } catch (err) {
                console.error("Feedback error:", err);
                toast.success("Thank you for your feedback!");
              }
            }}
          />
        </div>
      </section>

      {/* ── Help Center ── */}
      <HelpCenterSection />

      <footer id="about" className="border-t border-border/30 pt-16 pb-14">
        <div className="mx-auto max-w-[1400px] px-6">
          {/* ── About blurb ── */}
          <div className="text-center mb-10">
            <span className="font-display text-3xl font-bold tracking-tight text-foreground">
              AbhiAcademy
            </span>
            <p className="mt-3 text-base font-medium text-foreground leading-relaxed max-w-md mx-auto">
              Built by <span className="font-bold text-primary">Abhiraj Chandrawanshi</span> — a
              developer &amp; educator making practical skills accessible to everyone.
            </p>
          </div>

          {/* ── Find me on heading ── */}
          <div className="text-center mb-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Find me{" "}
              <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                on
              </span>
            </h2>
          </div>

          {/* ── Social buttons — centered row ── */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
            {/* Instagram */}
            <Button variant="outline" asChild>
              <a
                href="https://www.instagram.com/abhis.club"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2.5 text-sm transition-transform duration-200 hover:-translate-y-1 active:scale-95"
              >
                <Instagram className="h-5 w-5" />
                @abhis.club
              </a>
            </Button>

            {/* Telegram */}
            <Button variant="outline" asChild>
              <a
                href="https://t.me/Avii_tech_family"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2.5 text-sm transition-transform duration-200 hover:-translate-y-1 active:scale-95"
              >
                <Send className="h-5 w-5" />
                Avii Tech Family
              </a>
            </Button>

            {/* YouTube */}
            <Button variant="outline" asChild>
              <a
                href="https://www.youtube.com/@abhis.club"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2.5 text-sm transition-transform duration-200 hover:-translate-y-1 active:scale-95"
              >
                <Youtube className="h-5 w-5" />
                YouTube Channel
              </a>
            </Button>

            {/* Facebook */}
            <Button variant="outline" asChild>
              <a
                href="https://www.facebook.com/share/1BtpMK2ij3/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2.5 text-sm transition-transform duration-200 hover:-translate-y-1 active:scale-95"
              >
                <Facebook className="h-5 w-5" />
                Facebook Page
              </a>
            </Button>
          </div>

          {/* ── Bottom bar ── */}
          <div className="border-t border-border/30 pt-6 text-center">
            <span className="text-sm font-semibold text-foreground">
              © 2026 AbhiAcademy by Abhiraj Chandrawanshi. All rights reserved.
            </span>
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
          pdfPath={!isCartCheckout ? singleCourse?.pdfPath || "" : undefined}
          price={!isCartCheckout ? (singleCourse ? singleCourse.price : 0) : undefined}
          title={!isCartCheckout ? (singleCourse ? singleCourse.title : "") : undefined}
          courseId={!isCartCheckout ? checkoutCourseId : undefined}
          resources={!isCartCheckout ? singleCourse?.resources : undefined}
          // Cart (multi-course) mode props
          courses={isCartCheckout ? cartCheckoutCourses : undefined}
          matchedOffer={isCartCheckout ? cartCheckoutOffer : undefined}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "I made a payment but I did not receive the course / resources.",
    a: "Don't worry! Sometimes payments get processed but the confirmation step fails. In most cases your payment was either not captured or will be auto-refunded within 5–7 business days. Please contact our team below with your transaction ID and email so we can verify and resolve it promptly.",
  },
  {
    q: "My payment failed but the amount was deducted from my account.",
    a: "Failed payments are fully refunded by your bank or payment provider within 5–7 business days, depending on your bank's policy. If the amount is not credited after 7 days, please reach out to us with your bank statement screenshot and we will assist you.",
  },
  {
    q: "Can I get a refund after purchasing a course?",
    a: "We offer a refund within 48 hours of purchase if you have not accessed the course material. After 48 hours or once the content has been accessed, refunds are not applicable. Contact our team within the eligible window and we'll process it promptly.",
  },
  {
    q: "I purchased the course but I cannot see it on my profile.",
    a: "Please log out and log back in — your access is usually synced within a few minutes of payment confirmation. If the course still does not appear after 30 minutes, please contact us with your payment receipt and registered email.",
  },
  {
    q: "How do I access the course PDF or resource links?",
    a: "After purchasing, click the \"Access Course\" button on the course card. If your course includes a PDF, it will open directly. For video resources or external links, you will be redirected automatically. Make sure you are logged in with the same email used during purchase.",
  },
  {
    q: "I forgot my password. How do I reset it?",
    a: "On the login page, click \"Forgot Password\" and enter your registered email. You will receive a password-reset link within a few minutes. Check your spam/junk folder if you don't see it in your inbox.",
  },
  {
    q: "Is my personal and payment information secure?",
    a: "Yes. We use industry-standard encryption and we never store your card details. All payments are processed through trusted payment gateways (Razorpay / UPI). Your personal data is handled in accordance with our privacy policy.",
  },
];

// ─── HelpCenterSection component ──────────────────────────────────────────────
function HelpCenterSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", courseName: "", issue: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  // Convert selected file → base64 and set preview
  const handleImageChange = (file: File | null) => {
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    const maxMB = 5;
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`Image must be smaller than ${maxMB} MB.`);
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.issue.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      // Extract base64 string from dataURL (strip the "data:image/xxx;base64," prefix)
      let imageBase64: string | undefined;
      let imageMime: string | undefined;
      let imageName: string | undefined;
      if (imageFile && imagePreview) {
        const parts = imagePreview.split(",");
        imageBase64 = parts[1]; // raw base64
        imageMime = imageFile.type || "image/png";
        imageName = imageFile.name;
      }

      const result = await sendSupportEmail({
        data: {
          name: form.name.trim(),
          phone: form.phone.trim() || undefined,
          email: form.email.trim(),
          courseName: form.courseName.trim() || undefined,
          issue: form.issue.trim(),
          imageBase64,
          imageMime,
          imageName,
        },
      });
      if (result.success) {
        setSubmitted(true);
        setForm({ name: "", phone: "", email: "", courseName: "", issue: "" });
        setImageFile(null);
        setImagePreview(null);
        toast.success("Your message has been sent! We'll get back to you soon.");
      } else {
        toast.error("Failed to send message. Please try again or email us directly.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="helpcenter"
      className="border-t border-border/30 py-20 px-6"
    >
      <div className="mx-auto max-w-[860px]">
        {/* ── Header ── */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary mb-5">
            <HelpCircle className="h-4 w-4" />
            Help Center
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Frequently Asked{" "}
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            Can't find an answer? Scroll down and contact our team directly — we respond within 24 hours.
          </p>
        </div>

        {/* ── FAQ Accordion ── */}
        <div className="flex flex-col gap-3 mb-16">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                openIndex === i
                  ? "border-primary/40 bg-primary/5 shadow-md shadow-primary/10"
                  : "border-border/50 bg-card hover:border-primary/20 hover:bg-secondary/30"
              }`}
            >
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                id={`faq-${i}`}
              >
                <span className="font-semibold text-base text-foreground leading-snug">
                  {item.q}
                </span>
                <span className="shrink-0">
                  {openIndex === i ? (
                    <ChevronUp className="h-5 w-5 text-primary" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </span>
              </button>
              {openIndex === i && (
                <div className="overflow-hidden">
                  <p className="px-6 pb-5 text-sm sm:text-base text-muted-foreground leading-relaxed border-t border-border/30 pt-4">
                    {item.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Contact Our Team ── */}
        <div className="rounded-3xl border border-border/50 bg-card shadow-xl overflow-hidden">
          {/* Card header */}
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-8 py-8 text-white text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <MessageSquare className="h-6 w-6" />
              <h3 className="font-display text-2xl font-bold">Contact Our Team</h3>
            </div>
            <p className="text-white/80 text-sm">
              Still have an issue? Describe it below and we'll get back to you within 24 hours.
            </p>
          </div>

          <div className="p-8">
            {submitted ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                <div className="h-16 w-16 rounded-full bg-green-500/15 flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
                <h4 className="font-display text-xl font-bold text-foreground">Message Sent!</h4>
                <p className="text-muted-foreground text-sm max-w-xs">
                  We've received your message and will respond to <strong>{form.email || "your email"}</strong> within 24 hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Name */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="support-name" className="text-sm font-semibold flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="support-name"
                      type="text"
                      placeholder="Your name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      className="rounded-xl"
                    />
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="support-phone" className="text-sm font-semibold flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      Phone Number <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="support-phone"
                      type="tel"
                      placeholder="+91 XXXXX XXXXX"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="support-email" className="text-sm font-semibold flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="support-email"
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="rounded-xl"
                  />
                </div>

                {/* Course Name */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="support-course" className="text-sm font-semibold flex items-center gap-1.5">
                    📚 Which course had the issue?
                    <span className="text-muted-foreground text-xs font-normal">(write exact name)</span>
                  </Label>
                  <Input
                    id="support-course"
                    type="text"
                    placeholder="E.g. React Masterclass, Python for Beginners..."
                    value={form.courseName}
                    onChange={(e) => setForm({ ...form, courseName: e.target.value })}
                    className="rounded-xl"
                  />
                </div>

                {/* Issue */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="support-issue" className="text-sm font-semibold flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Describe Your Issue <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    id="support-issue"
                    placeholder="E.g. I paid ₹999 for the course on 20 Oct 2026 via UPI but never received access. My transaction ID is XXXXXX..."
                    value={form.issue}
                    onChange={(e) => setForm({ ...form, issue: e.target.value })}
                    required
                    rows={5}
                    className="rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y min-h-[120px] transition-all"
                  />
                </div>

                {/* Screenshot / Image Upload */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Attach a Screenshot <span className="text-muted-foreground text-xs font-normal">(optional, max 5 MB)</span>
                  </Label>

                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-border/60 bg-secondary/30">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full max-h-64 object-contain"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                        title="Remove image"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                      <div className="px-4 py-2 text-xs text-muted-foreground truncate">
                        {imageFile?.name}
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="support-screenshot"
                      className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 bg-secondary/20 px-6 py-8 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files?.[0];
                        if (f && f.type.startsWith("image/")) handleImageChange(f);
                      }}
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <ImageIcon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">Click or drag & drop an image here</span>
                      <span className="text-xs text-muted-foreground">PNG, JPG, GIF, WebP — max 5 MB</span>
                      <input
                        id="support-screenshot"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto sm:self-end flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="h-4 w-4" /> Send Message</>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
