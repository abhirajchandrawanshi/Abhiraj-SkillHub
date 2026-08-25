import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  LockKeyhole,
  LogIn,
  LogOut,
  Menu,
  ShieldCheck,
  ShoppingCart,
  X,
} from "lucide-react";

import { CheckoutDialog } from "@/components/CheckoutDialog";
import { grantCourseAccess, hasCourseAccess, type CourseAccess } from "@/lib/access";
import { COURSE_ID, COURSE_PRICE_INR, INTERNSHIP_ID, INTERNSHIP_PRICE_INR } from "@/lib/course";
import { getCourseBySlug } from "@/lib/firebase-courses";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const PDF_TITLE = "Python Notes";
const PDF_FILE = "/python-interview-questions.pdf";
const INTERNSHIP_TITLE = "100+ Paid Internships";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${PDF_TITLE} | Abhiraj Chandrawanshi` },
      { name: "description", content: "Complete Python notes for beginners to advanced learners." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [internshipCheckoutOpen, setInternshipCheckoutOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [internshipUnlocked, setInternshipUnlocked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOutUser } = useAuth();

  useEffect(() => {
    setUnlocked(hasCourseAccess(COURSE_ID));
    setInternshipUnlocked(hasCourseAccess(INTERNSHIP_ID));
    
    const syncAccess = () => setUnlocked(hasCourseAccess(COURSE_ID));
    const syncInternshipAccess = () => setInternshipUnlocked(hasCourseAccess(INTERNSHIP_ID));
    
    window.addEventListener("course-access-changed", syncAccess);
    window.addEventListener("internship-access-changed", syncInternshipAccess);
    
    return () => {
      window.removeEventListener("course-access-changed", syncAccess);
      window.removeEventListener("internship-access-changed", syncInternshipAccess);
    };
  }, []);

  const unlockPdf = (access: CourseAccess) => {
    grantCourseAccess(access);
    if (access.courseId === COURSE_ID) {
      setUnlocked(true);
      setNotice("Your Python Notes are unlocked. You can read or download them below.");
    } else if (access.courseId === INTERNSHIP_ID) {
      setInternshipUnlocked(true);
      setNotice("Your Internships List is unlocked. You can read or download it below.");
    }
  };

  const openCheckout = () => {
    setNotice("");
    setCheckoutOpen(true);
  };

  const openInternshipCheckout = () => {
    setNotice("");
    setInternshipCheckoutOpen(true);
  };

  const handleAuth = () => {
    setMenuOpen(false);
    void signOutUser();
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const openPreview = () => {
    setPreviewOpen(true);
    window.setTimeout(() => scrollTo("reader"), 0);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
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
              onClick={() => scrollTo("course")}
              className="text-muted-foreground hover:text-foreground"
            >
              Courses
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
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open cart"
              onClick={() => scrollTo("course")}
            >
              <ShoppingCart className="h-5 w-5" />
            </Button>
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
        {notice ? (
          <div
            role="status"
            className="border-b border-brand/30 bg-[#f4f0ff] px-6 py-3 text-center text-sm font-medium text-brand-foreground"
          >
            {notice}
          </div>
        ) : null}
        <section className="border-b border-border bg-[#faf9ff]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-[1fr_28rem] md:py-14">
            <div>
              <h1 className="max-w-xl font-display text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
                <span className="text-brand-foreground">Python</span> Notes
              </h1>
              <p className="mt-5 max-w-md text-xl leading-8 text-muted-foreground">
                Complete Python Notes for Beginners to Advanced
              </p>
              <Button className="mt-8" size="lg" variant="brand" onClick={openPreview}>
                View Course
              </Button>
            </div>
            <div id="course" className="overflow-hidden rounded-xl bg-white shadow-lift">
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
                <div className="mt-5 flex items-center gap-4">
                  <span className="font-display text-3xl font-bold text-brand-foreground">
                    ₹{COURSE_PRICE_INR}
                  </span>
                  <span className="text-base text-muted-foreground line-through">₹299</span>
                  <span className="rounded-full bg-[#eee8ff] px-3 py-1 text-xs font-bold text-brand-foreground">
                    99% OFF
                  </span>
                </div>
                <Button
                  className="mt-5 w-full"
                  size="lg"
                  variant="brand"
                  onClick={() => (unlocked ? scrollTo("reader") : openCheckout())}
                >
                  {unlocked ? "Read PDF" : "Buy Now"}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-[#faf9ff]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-[1fr_28rem] md:py-14">
            <div>
              <h1 className="max-w-xl font-display text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
                <span className="text-brand-foreground">100+ Paid</span> Internships
              </h1>
              <p className="mt-5 max-w-md text-xl leading-8 text-muted-foreground">
                Curated list of paid internship opportunities in top companies
              </p>
              <Button className="mt-8" size="lg" variant="brand" onClick={() => scrollTo("internships")}>
                View Internships
              </Button>
            </div>
            <div id="internships" className="overflow-hidden rounded-xl bg-white shadow-lift">
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
                  onClick={() => (internshipUnlocked ? scrollTo("internship-reader") : openInternshipCheckout())}
                >
                  {internshipUnlocked ? "Read List" : "Buy Now"}
                </Button>
              </div>
            </div>
          </div>
        </section>

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

        <section id="reader" className="mx-auto max-w-6xl scroll-mt-8 px-6 py-12">
          {unlocked ? (
            <div className="overflow-hidden rounded-xl border border-border bg-white shadow-soft">
              <div className="flex items-center justify-between border-b border-border p-5">
                <h2 className="font-display text-xl font-bold">Your Python Notes</h2>
                <a
                  className="flex items-center gap-2 text-sm font-semibold text-brand-foreground"
                  href={PDF_FILE}
                  download
                >
                  <Download className="h-4 w-4" /> Download
                </a>
              </div>
              <iframe title={PDF_TITLE} src={PDF_FILE} className="h-[75vh] min-h-[34rem] w-full" />
            </div>
          ) : previewOpen ? (
            <div>
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-brand-foreground">
                  Free preview
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold">Explore the first 3 pages</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Read a sample below. The remaining pages are locked.
                </p>
              </div>
              <PdfPreview />
              <div className="mt-8 rounded-xl border border-brand/30 bg-[#f4f0ff] p-8 text-center">
                <LockKeyhole className="mx-auto h-9 w-9 text-brand-foreground" />
                <h3 className="mt-3 font-display text-xl font-bold">
                  Continue reading with full access
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Unlock all 10 pages for ₹{COURSE_PRICE_INR} with one secure payment.
                </p>
                <Button className="mt-5" size="lg" variant="brand" onClick={openCheckout}>
                  <LockKeyhole className="h-4 w-4" /> Unlock PDF for ₹{COURSE_PRICE_INR}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-xl py-8 text-center">
              <LockKeyhole className="mx-auto h-10 w-10 text-brand-foreground" />
              <h2 className="mt-4 font-display text-2xl font-bold">Your PDF is locked</h2>
              <p className="mt-2 text-muted-foreground">
                Click View Course to read the first 3 pages, or unlock the complete Python notes for
                ₹{COURSE_PRICE_INR}.
              </p>
              <Button className="mt-6" size="lg" variant="brand" onClick={openPreview}>
                View 3-page preview
              </Button>
              <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Secure payment powered by Razorpay
              </p>
            </div>
          )}
        </section>

        <section id="internship-reader" className="mx-auto max-w-6xl scroll-mt-8 px-6 py-12">
          {internshipUnlocked ? (
            <div className="overflow-hidden rounded-xl border border-border bg-white shadow-soft">
              <div className="flex items-center justify-between border-b border-border p-5">
                <h2 className="font-display text-xl font-bold">Your Internships List</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://docs.google.com/spreadsheets/d/14YFhJa9aGHbBhCmY2cI5YtOGs3NBO1n3DT0fTVwc_DM/edit?usp=drivesdk', '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" /> Open in Google Sheets
                </Button>
              </div>
              <div className="p-8">
                <div className="mb-6">
                  <h3 className="font-display text-2xl font-bold mb-4">100+ Paid Internships</h3>
                  <p className="text-muted-foreground mb-6">
                    Complete list of paid internship opportunities from top companies. Click the button below to access the Google Sheets with all details.
                  </p>
                  <Button 
                    size="lg" 
                    variant="brand" 
                    onClick={() => window.open('https://docs.google.com/spreadsheets/d/14YFhJa9aGHbBhCmY2cI5YtOGs3NBO1n3DT0fTVwc_DM/edit?usp=drivesdk', '_blank')}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" /> Access Internships List
                  </Button>
                </div>
                <div className="rounded-lg bg-secondary/40 p-6">
                  <h4 className="font-semibold mb-3">Featured Internships:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Faabit Designs Pvt Ltd - Full Stack Developer - ₹5,000–10,000/month</li>
                    <li>• Nsse Fab - Azure & ASP.NET Core Support Engineer - ₹6,000–8,000/month</li>
                    <li>• DeepThought CultureTech Ventures - Full Stack Development (AI Platform) - ₹5,000–8,000/month</li>
                    <li>• EmpowerU (Promorph Solutions) - Backend Developer - ₹3,000–5,000/month</li>
                    <li>• Assetcues Solutions Pvt Ltd - .NET Developer - ₹7,000–10,000/month</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-xl py-8 text-center">
              <LockKeyhole className="mx-auto h-10 w-10 text-brand-foreground" />
              <h2 className="mt-4 font-display text-2xl font-bold">Your Internships List is locked</h2>
              <p className="mt-2 text-muted-foreground">
                Unlock the complete list of 100+ paid internships for ₹{INTERNSHIP_PRICE_INR}.
              </p>
              <Button className="mt-6" size="lg" variant="brand" onClick={openInternshipCheckout}>
                <LockKeyhole className="h-4 w-4" /> Unlock for ₹{INTERNSHIP_PRICE_INR}
              </Button>
              <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Secure payment powered by Razorpay
              </p>
            </div>
          )}
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
        price={COURSE_PRICE_INR}
        title={PDF_TITLE}
        onPaymentSuccess={unlockPdf}
        courseId={COURSE_ID}
      />
      <CheckoutDialog
        open={internshipCheckoutOpen}
        onOpenChange={setInternshipCheckoutOpen}
        price={INTERNSHIP_PRICE_INR}
        title={INTERNSHIP_TITLE}
        onPaymentSuccess={unlockPdf}
        courseId={INTERNSHIP_ID}
      />
    </div>
  );
}

function PdfPreview() {
  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const renderPreview = async () => {
      try {
        const [pdfjsLib, pdfWorker] = await Promise.all([
          import("pdfjs-dist"),
          import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
        ]);
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker.default;
        const document = await pdfjsLib.getDocument(PDF_FILE).promise;
        for (let pageNumber = 1; pageNumber <= Math.min(3, document.numPages); pageNumber += 1) {
          const page = await document.getPage(pageNumber);
          const canvas = canvasRefs.current[pageNumber - 1];
          if (!canvas || cancelled) continue;
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(1.25, 760 / baseViewport.width);
          const viewport = page.getViewport({ scale });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
        }
      } catch {
        if (!cancelled)
          setError("The preview will appear once the PDF is added to the public folder.");
      }
    };
    void renderPreview();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error)
    return (
      <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-8 text-center text-sm text-muted-foreground">
        {error}
      </div>
    );
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {[1, 2, 3].map((pageNumber) => (
        <div
          key={pageNumber}
          className="overflow-hidden rounded-lg border border-border bg-white shadow-soft"
        >
          <div className="border-b border-border bg-[#faf9ff] px-4 py-2 text-xs font-semibold text-muted-foreground">
            Page {pageNumber}
          </div>
          <canvas
            ref={(canvas) => {
              canvasRefs.current[pageNumber - 1] = canvas;
            }}
            className="block h-auto w-full"
          />
        </div>
      ))}
    </div>
  );
}
