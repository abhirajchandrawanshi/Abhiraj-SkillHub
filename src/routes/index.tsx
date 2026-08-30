import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  BookOpen,
  Download,
  FileText,
  LockKeyhole,
  LogIn,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import { INTERNSHIP_ID, INTERNSHIP_PRICE_INR, TESTING_ID, TESTING_PRICE_INR, TESTING_TITLE, OMNIROUTE_ID, OMNIROUTE_PRICE_INR, OMNIROUTE_TITLE, isLegacyCourseId, getLegacyCoursePrice, getLegacyCourseTitle } from "@/lib/course";
import { Button } from "@/components/ui/button";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { useAuth } from "@/hooks/use-auth";
import { useCourseAccess } from "@/hooks/use-course-access";
import type { CourseAccess } from "@/lib/access";
import { useQuery } from "@tanstack/react-query";
import { getPublishedCourses } from "@/lib/firebase-courses";

const SITE_TITLE = "Abhiraj Courses";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${SITE_TITLE} | Abhiraj Chandrawanshi` },
      { name: "description", content: "Learn programming with our comprehensive courses - Python, DSA, C++, Java, and more." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOutUser } = useAuth();
  const { access: internshipAccess, ready: accessReady } = useCourseAccess(INTERNSHIP_ID);
  const { access: testingAccess } = useCourseAccess(TESTING_ID);
  const { access: omnirouteAccess } = useCourseAccess(OMNIROUTE_ID);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutCourseId, setCheckoutCourseId] = useState(INTERNSHIP_ID);
  
  // Fetch dynamic courses from Firestore
  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ["published-courses"],
    queryFn: async () => {
      const result = await getPublishedCourses();
      return { courses: result };
    },
  });

  const dynamicCourses = coursesData?.courses || [];

  const handleAuth = () => {
    setMenuOpen(false);
    void signOutUser();
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const handleInternshipAccess = () => {
    if (internshipAccess) {
      window.open('https://docs.google.com/spreadsheets/d/14YFhJa9aGHbBhCmY2cI5YtOGs3NBO1n3DT0fTVwc_DM/edit?usp=drivesdk', '_blank');
    } else {
      setCheckoutCourseId(INTERNSHIP_ID);
      setCheckoutOpen(true);
    }
  };

  const handleTestingAccess = () => {
    if (testingAccess) {
      alert("Testing course access granted! The payment and access system is working correctly.");
    } else {
      setCheckoutCourseId(TESTING_ID);
      setCheckoutOpen(true);
    }
  };

  const handleOmnirouteAccess = () => {
    if (omnirouteAccess) {
      window.open('https://drive.google.com/file/d/1FgyD5AFVnuVEGp7XqiE3H5DlAkLEYKPB/view?usp=sharing', '_blank');
    } else {
      setCheckoutCourseId(OMNIROUTE_ID);
      setCheckoutOpen(true);
    }
  };

  const handlePaymentSuccess = (access: CourseAccess) => {
    setCheckoutOpen(false);
  };

  const handleDynamicCourseAccess = (courseId: string, coursePrice: number) => {
    // For dynamic courses, we'll use the existing checkout system
    setCheckoutCourseId(courseId);
    setCheckoutOpen(true);
  };

  const getDynamicCourseAccess = (courseId: string) => {
    // Check if user has access to this dynamic course
    // This would need to be implemented similarly to useCourseAccess
    return false; // For now, assume no access
  };

  const renderInternshipButton = (text: string) => {
    return (
      <span>
        {text}
        {!internshipAccess && <LockKeyhole className="h-4 w-4 ml-2" />}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-orange-500 py-2 text-center text-sm font-semibold text-white">
        🚧 Website is under construction - More courses coming soon!
      </div>
      <header className="border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between px-6">
          <a href="#top" className="font-display text-xl font-bold tracking-tight">
            Abhiraj <span className="text-brand-foreground">Courses</span>
          </a>
          <nav className="hidden items-center gap-9 text-sm font-medium md:flex">
            <button
              type="button"
              onClick={() => scrollTo("top")}
              className="border-b-2 border-brand-foreground py-5 text-brand-foreground"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => scrollTo("internships")}
              className="text-muted-foreground hover:text-foreground"
            >
              Internships
            </button>
            <button
              type="button"
              onClick={() => scrollTo("about")}
              className="text-muted-foreground hover:text-foreground"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => scrollTo("contact")}
              className="text-muted-foreground hover:text-foreground"
            >
              Contact
            </button>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => void navigate({ to: "/" })}>
                  Account
                </Button>
                <Button variant="brand" size="sm" onClick={handleAuth}>
                  <LogOut className="h-4 w-4" /> Logout
                </Button>
              </>
            ) : (
              <Button variant="brand" size="sm" onClick={() => void navigate({ to: "/login" })}>
                <LogIn className="h-4 w-4" />{" "}
                <span className="hidden sm:inline">Login / Sign Up</span>
                <span className="sm:hidden">Login</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="md:hidden"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* OmniRoute Setup Section - TOP */}
        <section className="border-b border-border bg-gradient-to-br from-[#f0fdfa] to-[#f0f9ff]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-[1fr_28rem] md:py-14">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-teal-100 px-4 py-1.5 text-xs font-bold text-teal-700 uppercase tracking-wider">
                🔥 New
              </div>
              <h1 className="max-w-xl font-display text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
                <span className="text-teal-600">OmniRoute</span> Setup for Free Claude Tokens
              </h1>
              <p className="mt-5 max-w-md text-xl leading-8 text-muted-foreground">
                Easy 4 step setup to get 1.5 Billion AI tokens each month completely FREE
              </p>
              <Button
                className="mt-8"
                size="lg"
                variant="brand"
                style={omnirouteAccess ? { backgroundColor: "#0d9488", color: "white" } : undefined}
                onClick={handleOmnirouteAccess}
              >
                <span>
                  {omnirouteAccess ? "Access Guide" : "Get Access — ₹9"}
                  {!omnirouteAccess && <LockKeyhole className="h-4 w-4 ml-2" />}
                </span>
              </Button>
            </div>
            <div className="overflow-hidden rounded-xl bg-white shadow-lift">
              <div className="flex h-52 items-center justify-center gap-5 bg-gradient-to-br from-[#0f172a] to-[#134e4a] text-white">
                <span className="text-7xl font-bold leading-none">🤖</span>
                <div>
                  <p className="font-display text-4xl font-bold">OmniRoute</p>
                  <p className="text-2xl font-semibold text-teal-300">Free AI Tokens</p>
                </div>
              </div>
              <div className="p-6">
                <h2 className="font-display text-xl font-bold">OmniRoute Setup for Free Claude Tokens</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Easy 4 step setup to get 1.5 Billion AI tokens each month completely FREE
                </p>
                <div className="mt-5 flex items-center gap-4">
                  <span className="font-display text-3xl font-bold text-teal-600">
                    ₹{OMNIROUTE_PRICE_INR}
                  </span>
                  <span className="text-base text-muted-foreground line-through">₹499</span>
                  <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-700">
                    98% OFF
                  </span>
                </div>
                <Button
                  className="mt-5 w-full"
                  size="lg"
                  variant="brand"
                  style={omnirouteAccess ? { backgroundColor: "#0d9488", color: "white" } : {}}
                  onClick={handleOmnirouteAccess}
                >
                  <span>
                    {omnirouteAccess ? "Access Guide" : "Get Access — ₹9"}
                    {!omnirouteAccess && <LockKeyhole className="h-4 w-4 ml-2" />}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 100+ Paid Internships Section */}
        <section id="internships" className="border-b border-border bg-[#faf9ff]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-[1fr_28rem] md:py-14">
            <div>
              <h1 className="max-w-xl font-display text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
                <span className="text-brand-foreground">100+ Paid</span> Internships
              </h1>
              <p className="mt-5 max-w-md text-xl leading-8 text-muted-foreground">
                Curated list of paid internship opportunities in top companies
              </p>
              <Button 
                className="mt-8" 
                size="lg" 
                variant="brand"
                style={internshipAccess ? { backgroundColor: "#22c55e", color: "white" } : undefined}
                onClick={handleInternshipAccess}
              >
                {renderInternshipButton(internshipAccess ? "Access Now" : "Buy Now")}
              </Button>
            </div>
            <div className="overflow-hidden rounded-xl bg-white shadow-lift">
              <div className="flex h-52 items-center justify-center gap-5 bg-[#081525] text-white">
                <span className="text-7xl font-bold leading-none text-[#3776ab]">💼</span>
                <div>
                  <p className="font-display text-4xl font-bold">Internships</p>
                  <p className="text-2xl font-semibold text-[#ffd343]">100+ Paid</p>
                </div>
              </div>
              <div className="p-6">
                <h2 className="font-display text-xl font-bold">100+ Paid Internships List</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Complete list with company details, stipend, and application links
                </p>
                <div className="mt-5 flex items-center gap-4">
                  <span className="font-display text-3xl font-bold text-brand-foreground">
                    ₹{INTERNSHIP_PRICE_INR}
                  </span>
                  <span className="text-base text-muted-foreground line-through">₹199</span>
                  <span className="rounded-full bg-[#eee8ff] px-3 py-1 text-xs font-bold text-brand-foreground">
                    99% OFF
                  </span>
                </div>
                <Button
                  className="mt-5 w-full"
                  size="lg"
                  variant="brand"
                  style={internshipAccess ? { backgroundColor: "#22c55e", color: "white" } : {}}
                  onClick={handleInternshipAccess}
                >
                  {renderInternshipButton(internshipAccess ? "Access" : "Buy Now")}
                </Button>
              </div>
            </div>
          </div>
        </section>


        {/* Python Course Section - CHANGED TO COMING SOON */}
        <section className="border-b border-border bg-[#faf9ff]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-[1fr_28rem] md:py-14">
            <div>
              <h1 className="max-w-xl font-display text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
                <span className="text-brand-foreground">Python</span> Notes
              </h1>
              <p className="mt-5 max-w-md text-xl leading-8 text-muted-foreground">
                Complete Python Notes for Beginners to Advanced
              </p>
              <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-600">
                🚧 Coming Soon
              </div>
            </div>
            <div className="overflow-hidden rounded-xl bg-white shadow-lift">
              <div className="flex h-52 items-center justify-center gap-5 bg-[#081525] text-white">
                <span className="text-7xl font-bold leading-none text-[#3776ab]">Py</span>
                <div>
                  <p className="font-display text-4xl font-bold">Python</p>
                  <p className="text-2xl font-semibold text-[#ffd343]">Notes</p>
                </div>
              </div>
              <div className="p-6">
                <h2 className="font-display text-xl font-bold">Python Complete Notes</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Well structured notes from basics to advanced
                </p>
                <Button
                  className="mt-5 w-full"
                  size="lg"
                  variant="outline"
                  disabled
                >
                  Coming Soon
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* DSA Course Section */}
        <section className="border-b border-border bg-[#faf9ff]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-[1fr_28rem] md:py-14">
            <div>
              <h1 className="max-w-xl font-display text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
                <span className="text-brand-foreground">DSA</span> Course
              </h1>
              <p className="mt-5 max-w-md text-xl leading-8 text-muted-foreground">
                Data Structures and Algorithms for coding interviews
              </p>
              <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-600">
                🚧 Coming Soon
              </div>
            </div>
            <div className="overflow-hidden rounded-xl bg-white shadow-lift">
              <div className="flex h-52 items-center justify-center gap-5 bg-[#081525] text-white">
                <span className="text-7xl font-bold leading-none text-[#ff7f50]">DS</span>
                <div>
                  <p className="font-display text-4xl font-bold">DSA</p>
                  <p className="text-2xl font-semibold text-[#ffd343]">Course</p>
                </div>
              </div>
              <div className="p-6">
                <h2 className="font-display text-xl font-bold">Data Structures & Algorithms</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Complete DSA guide for interview preparation
                </p>
                <Button
                  className="mt-5 w-full"
                  size="lg"
                  variant="outline"
                  disabled
                >
                  Coming Soon
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* C++ Course Section */}
        <section className="border-b border-border bg-[#faf9ff]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-[1fr_28rem] md:py-14">
            <div>
              <h1 className="max-w-xl font-display text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
                <span className="text-brand-foreground">C++</span> Course
              </h1>
              <p className="mt-5 max-w-md text-xl leading-8 text-muted-foreground">
                Master C++ programming from basics to advanced
              </p>
              <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-600">
                🚧 Coming Soon
              </div>
            </div>
            <div className="overflow-hidden rounded-xl bg-white shadow-lift">
              <div className="flex h-52 items-center justify-center gap-5 bg-[#081525] text-white">
                <span className="text-7xl font-bold leading-none text-[#00599c]">C++</span>
                <div>
                  <p className="font-display text-4xl font-bold">C++</p>
                  <p className="text-2xl font-semibold text-[#ffd343]">Course</p>
                </div>
              </div>
              <div className="p-6">
                <h2 className="font-display text-xl font-bold">C++ Programming</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Complete C++ guide with OOP concepts
                </p>
                <Button
                  className="mt-5 w-full"
                  size="lg"
                  variant="outline"
                  disabled
                >
                  Coming Soon
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Java Course Section */}
        <section className="border-b border-border bg-[#faf9ff]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-[1fr_28rem] md:py-14">
            <div>
              <h1 className="max-w-xl font-display text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
                <span className="text-brand-foreground">Java</span> Course
              </h1>
              <p className="mt-5 max-w-md text-xl leading-8 text-muted-foreground">
                Learn Java programming and enterprise development
              </p>
              <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-600">
                🚧 Coming Soon
              </div>
            </div>
            <div className="overflow-hidden rounded-xl bg-white shadow-lift">
              <div className="flex h-52 items-center justify-center gap-5 bg-[#081525] text-white">
                <span className="text-7xl font-bold leading-none text-[#007396]">Java</span>
                <div>
                  <p className="font-display text-4xl font-bold">Java</p>
                  <p className="text-2xl font-semibold text-[#ffd343]">Course</p>
                </div>
              </div>
              <div className="p-6">
                <h2 className="font-display text-xl font-bold">Java Programming</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Complete Java guide with Spring Framework
                </p>
                <Button
                  className="mt-5 w-full"
                  size="lg"
                  variant="outline"
                  disabled
                >
                  Coming Soon
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* C Course Section */}
        <section className="border-b border-border bg-[#faf9ff]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-[1fr_28rem] md:py-14">
            <div>
              <h1 className="max-w-xl font-display text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
                <span className="text-brand-foreground">C</span> Programming
              </h1>
              <p className="mt-5 max-w-md text-xl leading-8 text-muted-foreground">
                Master C programming fundamentals and advanced concepts
              </p>
              <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-600">
                🚧 Coming Soon
              </div>
            </div>
            <div className="overflow-hidden rounded-xl bg-white shadow-lift">
              <div className="flex h-52 items-center justify-center gap-5 bg-[#081525] text-white">
                <span className="text-7xl font-bold leading-none text-[#00599c]">C</span>
                <div>
                  <p className="font-display text-4xl font-bold">C</p>
                  <p className="text-2xl font-semibold text-[#ffd343]">Programming</p>
                </div>
              </div>
              <div className="p-6">
                <h2 className="font-display text-xl font-bold">C Programming</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Complete C programming guide
                </p>
                <Button
                  className="mt-5 w-full"
                  size="lg"
                  variant="outline"
                  disabled
                >
                  Coming Soon
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Testing Course Section - FOR TESTING ONLY */}
        <section className="border-b border-border bg-[#faf9ff]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-[1fr_28rem] md:py-14">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                ⚠️ Testing Only
              </div>
              <h1 className="max-w-xl font-display text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
                Payment & Access Testing
              </h1>
              <p className="mt-5 max-w-md text-xl leading-8 text-muted-foreground">
                <span className="text-red-600 font-bold">DO NOT PAY</span> this is for testing purpose
              </p>
              <Button 
                className="mt-8" 
                size="lg" 
                variant="outline"
                onClick={handleTestingAccess}
              >
                {testingAccess ? "Testing Complete" : "Test Payment (₹1)"}
              </Button>
            </div>
            <div className="overflow-hidden rounded-xl bg-white shadow-lift">
              <div className="flex h-52 items-center justify-center gap-5 bg-[#081525] text-white">
                <span className="text-7xl font-bold leading-none">🧪</span>
                <div>
                  <p className="font-display text-4xl font-bold">Testing</p>
                  <p className="text-2xl font-semibold text-[#ffd343]">Course</p>
                </div>
              </div>
              <div className="p-6">
                <h2 className="font-display text-xl font-bold">Payment & Access Testing</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Complete end-to-end testing of payment and access system
                </p>
                <div className="mt-5 flex items-center gap-4">
                  <span className="font-display text-3xl font-bold text-brand-foreground">
                    ₹{TESTING_PRICE_INR}
                  </span>
                  <span className="text-base text-muted-foreground line-through">₹99</span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    Test Only
                  </span>
                </div>
                <Button
                  className="mt-5 w-full"
                  size="lg"
                  variant="outline"
                  onClick={handleTestingAccess}
                >
                  {testingAccess ? "Testing Complete" : "Test Payment (₹1)"}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic Courses Section */}
        {!coursesLoading && dynamicCourses.length > 0 && (
          <section className="border-b border-border bg-[#faf9ff]">
            <div className="mx-auto max-w-6xl px-6 py-12 md:py-14">
              <div className="mb-8">
                <h2 className="font-display text-3xl font-bold">More Courses</h2>
                <p className="mt-2 text-muted-foreground">
                  Explore our latest course offerings
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {dynamicCourses.map((course) => (
                  <div key={course.id} className="overflow-hidden rounded-xl bg-white shadow-lift">
                    {course.thumbnail && (
                      <div className="aspect-video w-full overflow-hidden">
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="mb-2 inline-flex items-center rounded-full bg-brand-foreground/10 px-3 py-1 text-xs font-semibold text-brand-foreground">
                        {course.category}
                      </div>
                      <h3 className="font-display text-xl font-bold">{course.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {course.subtitle}
                      </p>
                      <div className="mt-4 flex items-center gap-3">
                        <span className="font-display text-2xl font-bold text-brand-foreground">
                          ₹{course.price}
                        </span>
                        {course.originalPrice && course.originalPrice > course.price && (
                          <>
                            <span className="text-sm text-muted-foreground line-through">
                              ₹{course.originalPrice}
                            </span>
                            {course.discount && (
                              <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-600">
                                {course.discount}% OFF
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <Button
                        className="mt-4 w-full"
                        size="lg"
                        variant="brand"
                        onClick={() => handleDynamicCourseAccess(course.id, course.price)}
                      >
                        {getDynamicCourseAccess(course.id) ? "Access Now" : "Buy Now"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section id="about" className="border-b border-border bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-9 sm:grid-cols-3">
            {[
              [BookOpen, "Easy to Understand"],
              [FileText, "Well Structured"],
              [Download, "Download & Access Forever"],
            ].map(([Icon, label]) => (
              <div
                key={label as string}
                className="flex items-center justify-center gap-4 text-sm font-semibold"
              >
                <span className="grid h-14 w-14 place-items-center rounded-xl bg-[#f0eaff] text-brand-foreground">
                  <Icon className="h-7 w-7" />
                </span>
                <span>{label as string}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer id="contact" className="border-t border-border bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Abhiraj Courses. All rights reserved.</p>
          <nav className="flex gap-7">
            <a href="#about" className="hover:text-foreground">
              About
            </a>
            <a href="#contact" className="hover:text-foreground">
              Contact
            </a>
            <a href="#contact" className="hover:text-foreground">
              Terms
            </a>
            <a href="#contact" className="hover:text-foreground">
              Privacy
            </a>
          </nav>
        </div>
      </footer>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        price={
          checkoutCourseId === TESTING_ID ? TESTING_PRICE_INR :
          checkoutCourseId === OMNIROUTE_ID ? OMNIROUTE_PRICE_INR :
          INTERNSHIP_PRICE_INR
        }
        title={
          checkoutCourseId === TESTING_ID ? TESTING_TITLE :
          checkoutCourseId === OMNIROUTE_ID ? OMNIROUTE_TITLE :
          "100+ Paid Internships"
        }
        onPaymentSuccess={handlePaymentSuccess}
        courseId={checkoutCourseId}
      />
    </div>
  );
}
