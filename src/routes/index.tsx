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
  LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useDynamicCourseAccess } from "@/hooks/use-dynamic-course-access";
import type { CourseAccess } from "@/lib/access";
import { readCourseAccess } from "@/lib/access";
import { useQuery } from "@tanstack/react-query";
import { getPublishedCourses } from "@/lib/firebase-courses";
import type { Course } from "@/lib/firebase-courses";
import { createSignedPdfUrl } from "@/lib/supabase-server";

const SITE_TITLE = "Skillearn";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${SITE_TITLE} | Practical Skills for a Better Tomorrow` },
      { name: "description", content: "Industry-relevant courses, created by experts, to help you build real skills and achieve your goals." },
    ],
  }),
  component: Landing,
});

function CourseCard({ course, onEnroll, index }: { course: Course; onEnroll: (courseId: string) => void; index: number }) {
  const { user } = useAuth();
  const { access: courseAccess, loading: accessLoading } = useDynamicCourseAccess(course.id);
  const [pdfLoading, setPdfLoading] = useState(false);
  
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [hasRated, setHasRated] = useState(false);
  
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
    // In a real app, this would save to the backend.
    setTimeout(() => {
      // simulate saving delay
    }, 500);
  };

  // Dynamic or default data
  const rating = course.rating || 4.8;
  const ratingCount = course.ratingCount || 1200;
  // Format rating count (e.g., 1200 -> 1.2K)
  const formattedRatingCount = ratingCount >= 1000 ? (ratingCount / 1000).toFixed(1) + "K" : ratingCount.toString();
  const publishedDate = course.publishedDate ? new Date(course.publishedDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Aug 2024";
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="overflow-hidden rounded-xl bg-card border border-border shadow-sm flex flex-col w-full h-full transition-all hover:shadow-md"
    >
      {course.thumbnail && (
        <div className="aspect-[16/10] w-full overflow-hidden relative">
           <img
            src={course.thumbnail}
            alt={course.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <h3 className="font-display text-lg font-bold leading-tight">{course.title}</h3>
        
        {course.subtitle && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {course.subtitle}
          </p>
        )}

        {/* Rating */}
        <div className="flex items-center text-sm font-medium gap-1.5 text-foreground">
          <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
          {rating.toFixed(1)} <span className="text-muted-foreground font-normal">({formattedRatingCount})</span>
        </div>

        <div className="flex-1" />

        {/* Price & Action & Date */}
        <div className="pt-3 border-t border-border mt-1 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Published: {publishedDate}</span>
            <div className="flex items-center gap-2">
              {course.originalPrice && course.originalPrice > course.price && (
                <span className="text-sm text-muted-foreground line-through">
                  ₹{course.originalPrice}
                </span>
              )}
              <span className="font-display text-lg font-bold text-foreground">
                ₹{course.price}
              </span>
            </div>
          </div>
          
          <Button 
            onClick={handleCourseAccess}
            disabled={accessLoading || pdfLoading}
            variant="default"
            size="sm"
            className="bg-primary w-full text-primary-foreground hover:opacity-90 rounded-lg"
          >
            {accessLoading || pdfLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : courseAccess ? (
              "Access Course"
            ) : (
              <>
                Buy Now <ArrowRight className="h-4 w-4 ml-1.5" />
              </>
            )}
          </Button>

          {/* Feedback Rating UI (Visible only to enrolled users) */}
          {courseAccess && (
            <AnimatePresence>
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                className="mt-2 flex flex-col items-center bg-secondary/50 p-3 rounded-lg border border-border"
              >
                {hasRated ? (
                  <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                    ✓ Thanks for your feedback!
                  </motion.div>
                ) : (
                  <>
                    <span className="text-xs font-semibold text-muted-foreground mb-2">Rate this course</span>
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
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
}



function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOutUser } = useAuth();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutCourseId, setCheckoutCourseId] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
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

  const dynamicCourses = coursesData?.courses || [];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const handlePaymentSuccess = () => {
    setCheckoutOpen(false);
  };

  const handleDynamicCourseAccess = (courseId: string) => {
    setCheckoutCourseId(courseId);
    setCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-background/85 sticky top-0 z-50 py-4 border-b border-border/50 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6">
          <div className="flex items-center gap-10">
            <a href="#top" className="font-display text-2xl font-bold tracking-tight">
              Skillearn
            </a>
            <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
              <button onClick={() => scrollTo("top")} className="text-muted-foreground hover:text-foreground">Home</button>
              <button onClick={() => scrollTo("courses")} className="border-b-2 border-foreground pb-1 text-foreground font-semibold">Courses</button>
              <button onClick={() => scrollTo("about")} className="text-muted-foreground hover:text-foreground">About</button>
            </nav>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search courses..." 
                className="h-10 w-64 rounded-full bg-secondary pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button className="text-foreground hover:text-muted-foreground relative">
              <ShoppingCart className="h-5 w-5" />
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

      <main id="top">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-16 lg:pt-16 lg:pb-20">
          {/* Subtle background gradient blob similar to design */}
          <div className="absolute right-0 top-0 -z-10 h-[500px] w-[500px] -translate-y-[10%] translate-x-[20%] rounded-full bg-primary/10 dark:bg-primary/5 blur-[100px] opacity-70"></div>
          
          <div className="mx-auto max-w-[1400px] px-6 relative">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="max-w-2xl relative"
            >
              <p className="mb-4 text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
                Learn. Build. Grow.
              </p>
              <div className="relative">
                <h1 className="font-display text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight text-foreground">
                  Practical Skills for a <br className="hidden md:block"/>
                  <span className="text-gradient-tomorrow">Better Tomorrow</span>
                </h1>
                
                {/* Invest in your skills — Animated Doodle */}
                <motion.div 
                  initial={{ opacity: 0, x: -20, rotate: 0 }}
                  animate={{ opacity: 1, x: 0, rotate: -8, y: [0, -6, 0] }}
                  transition={{
                    opacity: { duration: 0.6, delay: 0.5 },
                    x: { duration: 0.6, delay: 0.5 },
                    rotate: { duration: 0.6, delay: 0.5 },
                    y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.2 },
                  }}
                  className="pointer-events-none absolute right-[-5rem] md:right-[-6rem] lg:right-[-4rem] top-[80%] hidden md:flex flex-col items-start border-2 border-red-500 rounded-xl p-4"
                >
                  <motion.p
                    className="bg-gradient-to-br from-blue-600 via-blue-400 to-blue-600 bg-clip-text text-transparent font-display text-2xl md:text-3xl font-bold leading-tight"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                  >
                    Invest in
                    <br />
                    your skills
                  </motion.p>
                  <motion.svg
                    width="60"
                    height="60"
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mt-1 -ml-1"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="blue-arrow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="55%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#2563eb" />
                      </linearGradient>
                    </defs>
                    <motion.path
                      d="M18 18 Q 78 18 78 78"
                      stroke="url(#blue-arrow)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      fill="none"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 1.1, delay: 0.8, ease: "easeInOut" }}
                    />
                    <motion.path
                      d="M66 72 L78 80 L84 66"
                      stroke="url(#blue-arrow)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.4, delay: 1.7, ease: "easeOut" }}
                    />
                  </motion.svg>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Dynamic Courses Section */}
        <section id="courses" className="pb-24">
          <div className="mx-auto max-w-[1400px] px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <h2 className="font-display text-2xl font-bold text-foreground">All Courses</h2>
              
              <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/50">
                Most Popular
                <ChevronDown className="h-4 w-4" />
              </button>
            </motion.div>
            
            {!isMounted || coursesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : dynamicCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {dynamicCourses.map((course, index) => (
                  <CourseCard key={course.id} course={course} onEnroll={handleDynamicCourseAccess} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No courses available at the moment. Please check back later.
              </div>
            )}
          </div>
        </section>
      </main>

      <footer id="about" className="border-t border-border bg-background pt-8 pb-12">
        <div className="mx-auto max-w-[1400px] px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="font-display text-xl font-bold tracking-tight text-foreground">Skillearn</span>
            <span className="text-sm text-muted-foreground">© 2024 Skillearn. All rights reserved.</span>
          </div>
          
          <nav className="flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <button onClick={() => scrollTo("top")} className="hover:text-foreground">Home</button>
            <button onClick={() => scrollTo("courses")} className="hover:text-foreground">Courses</button>
            <button onClick={() => scrollTo("about")} className="hover:text-foreground">About</button>
          </nav>

          <div className="flex items-center gap-4 text-muted-foreground">
            <a href="#" className="hover:text-foreground"><Linkedin className="h-5 w-5" /></a>
            <a href="#" className="hover:text-foreground"><Github className="h-5 w-5" /></a>
            <a href="#" className="hover:text-foreground"><Youtube className="h-5 w-5" /></a>
          </div>
        </div>
      </footer>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        accessInfo={(() => {
          const course = dynamicCourses.find(c => c.id === checkoutCourseId);
          return course?.details ?? "";
        })()}
        pdfPath={(() => {
          const course = dynamicCourses.find(c => c.id === checkoutCourseId);
          return course?.pdfPath || "";
        })()}
        price={(() => {
          const course = dynamicCourses.find(c => c.id === checkoutCourseId);
          return course ? course.price : 0;
        })()}
        title={(() => {
          const course = dynamicCourses.find(c => c.id === checkoutCourseId);
          return course ? course.title : "";
        })()}
        onPaymentSuccess={handlePaymentSuccess}
        courseId={checkoutCourseId}
      />
    </div>
  );
}

