import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Award,
  Bell,
  BadgeCheck,
  Check,
  ChevronDown,
  Clock,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  Menu,
  Monitor,
  Play,
  Send,
  ShoppingCart,
  Star,
  Twitter,
  Youtube,
} from "lucide-react";

import heroImage from "@/assets/hero-learning.jpg";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COURSE_TITLE = "Full-Stack Career Accelerator";
const PRICE = 4499;
const ORIGINAL_PRICE = 11999;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Abhiraj Chandrawanshi — Full-Stack Career Accelerator Course" },
      {
        name: "description",
        content:
          "Learn full-stack development with a mentor-led, project-based program. Live cohorts, certificate, placement support. Enroll today at 62% off.",
      },
      { property: "og:title", content: "Abhiraj Chandrawanshi — Full-Stack Career Accelerator" },
      {
        property: "og:description",
        content:
          "Mentor-led full-stack course with live cohorts, real projects, certification and placement support.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <Hero onBuy={() => setCheckoutOpen(true)} />
        <NoticeBar open={noticeOpen} onToggle={() => setNoticeOpen((v) => !v)} />
        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:py-14">
          <CourseContent onBuy={() => setCheckoutOpen(true)} />
          <Sidebar onBuy={() => setCheckoutOpen(true)} />
        </section>
      </main>
      <Footer />
      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        price={PRICE}
        title={COURSE_TITLE}
      />
    </div>
  );
}

const NAV_LINKS = ["Home", "Courses", "About", "Reviews", "FAQs"];

function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 lg:grid-cols-[auto_1fr_auto]">
        <a href="#top" className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink font-display text-sm font-bold text-ink-foreground">
            AC
          </span>
          <span className="truncate font-display text-base font-bold sm:text-lg">
            Abhiraj Chandrawanshi
          </span>
        </a>

        <nav className="hidden justify-center gap-1 lg:flex">
          {NAV_LINKS.map((link, index) => (
            <a
              key={link}
              href="#top"
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                index === 0
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {link}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand" />
          </Button>
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-ink text-xs font-semibold text-ink-foreground">
              AC
            </AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="icon" aria-label="Open menu" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero({ onBuy }: { onBuy: () => void }) {
  return (
    <section id="top" className="mx-auto max-w-7xl px-4 pt-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-brand shadow-lift">
        <div className="grid items-center gap-6 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-ink/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-foreground">
              <BadgeCheck className="h-3.5 w-3.5" /> Cohort 07 · Live mentorship
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] text-brand-foreground sm:text-5xl lg:text-6xl">
              Master New Skills.
              <br />
              Build Your Future.
            </h1>
            <p className="mt-4 max-w-lg text-base text-brand-foreground/80 sm:text-lg">
              A 16-week, project-first full-stack program — ship six real products, get code reviewed
              by working engineers, and finish with a portfolio recruiters actually read.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button variant="ink" size="xl" onClick={onBuy}>
                Enroll Now — ₹{PRICE.toLocaleString("en-IN")}
              </Button>
              <Button
                variant="outline"
                size="xl"
                className="border-brand-foreground/25 bg-transparent text-brand-foreground hover:bg-brand-foreground/10 hover:text-brand-foreground"
              >
                <Play className="h-4 w-4" /> Watch preview
              </Button>
            </div>
            <p className="mt-4 text-sm font-medium text-brand-foreground/75">
              12,480 learners · 4.8 average rating · Certificate on completion
            </p>
          </div>

          <div className="relative">
            <img
              src={heroImage}
              alt="Illustration of a student building projects with code, certificate and skill cards"
              width={1024}
              height={848}
              className="w-full rounded-2xl object-cover shadow-soft"
            />
          </div>
        </div>

        <span className="absolute left-4 top-4 hidden rounded-full bg-background/85 px-3 py-1 text-xs font-semibold text-foreground shadow-soft sm:block">
          ★ Top-rated 2026
        </span>
        <span className="absolute right-4 top-4 hidden rounded-full bg-background/85 px-3 py-1 text-xs font-semibold text-foreground shadow-soft sm:block">
          Partner · TechEd India
        </span>
      </div>
    </section>
  );
}

function NoticeBar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="mx-auto mt-6 max-w-7xl px-4">
      <div className="overflow-hidden rounded-2xl bg-ink text-ink-foreground shadow-soft">
        <button
          onClick={onToggle}
          aria-expanded={open}
          className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 text-left"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-brand-foreground">
              <Award className="h-4 w-4" />
            </span>
            <span className="truncate text-sm font-semibold">
              Limited seats left — only 23 spots in Cohort 07
            </span>
          </span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open ? (
          <div className="border-t border-ink-foreground/10 px-5 py-4 text-sm text-ink-foreground/75">
            Early-bird pricing ends in 8 days. Follow us on social media for weekly free workshops,
            hiring updates and interview prep sessions.
          </div>
        ) : null}
      </div>
    </div>
  );
}

const DETAILS = [
  { icon: Clock, label: "Duration", value: "16 weeks · 120 hrs" },
  { icon: Monitor, label: "Mode", value: "Online · Live + recorded" },
  { icon: Award, label: "Certificate", value: "Verified, shareable" },
  { icon: Globe, label: "Language", value: "English & Hindi" },
];

const LEARN = [
  "Build production React apps with TypeScript and modern tooling",
  "Design REST and realtime APIs backed by PostgreSQL",
  "Authentication, roles and row-level security done properly",
  "Testing, CI/CD and deploying to the edge",
  "System design fundamentals for interviews",
  "Portfolio, résumé and mock-interview coaching",
];

const CURRICULUM = [
  { week: "Weeks 1–3", title: "Foundations", desc: "JavaScript deep dive, Git, HTML/CSS systems." },
  { week: "Weeks 4–7", title: "Frontend craft", desc: "React, TypeScript, state, design systems." },
  { week: "Weeks 8–11", title: "Backend & data", desc: "APIs, Postgres, auth, background jobs." },
  { week: "Weeks 12–14", title: "Ship it", desc: "Testing, CI/CD, observability, deployment." },
  { week: "Weeks 15–16", title: "Career sprint", desc: "Portfolio, résumé, mock interviews." },
];

const REVIEWS = [
  {
    name: "Priya Nair",
    role: "SDE-1 @ Zeta",
    text: "The code reviews were brutal in the best way. I went from tutorials to shipping a real product in three months.",
  },
  {
    name: "Rohan Mehta",
    role: "Frontend Dev @ Razorpay",
    text: "Best part was the live sessions. Every doubt got cleared the same day instead of dying in a comment thread.",
  },
  {
    name: "Ananya Gupta",
    role: "Final-year student",
    text: "The career sprint alone was worth the fee. Two offers before the cohort ended.",
  },
];

const FAQS = [
  {
    q: "Do I need prior coding experience?",
    a: "Basic programming logic helps, but the first three weeks rebuild foundations from scratch.",
  },
  {
    q: "What if I miss a live session?",
    a: "Every session is recorded and available for lifetime, along with notes and code.",
  },
  {
    q: "Is there a refund policy?",
    a: "Yes — full refund within the first 7 days, no questions asked.",
  },
  {
    q: "Do you help with placements?",
    a: "The final two weeks are a dedicated career sprint with referrals to hiring partners.",
  },
];

function CourseContent({ onBuy }: { onBuy: () => void }) {
  return (
    <div className="min-w-0 space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <Badge className="bg-accent text-accent-foreground hover:bg-accent">Bestseller</Badge>
        <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{COURSE_TITLE}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="flex items-center gap-1 font-semibold">
            4.8
            <span className="flex text-brand-foreground">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </span>
          </span>
          <span className="text-muted-foreground">2,140 ratings · 12,480 learners</span>
        </div>
        <p className="mt-4 text-muted-foreground">
          A mentor-led program that takes you from fundamentals to shipping full-stack products, with
          weekly live sessions, graded projects and one-on-one code reviews.
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl bg-secondary p-1.5">
          {["overview", "curriculum", "instructor", "reviews", "faqs"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-xl px-4 py-2 text-sm capitalize data-[state=active]:bg-card data-[state=active]:shadow-soft"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-5 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {DETAILS.map((detail) => (
              <div
                key={detail.label}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <detail.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {detail.label}
                  </p>
                  <p className="truncate font-semibold">{detail.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h3 className="font-display text-xl font-bold">What you'll learn</h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {LEARN.map((item) => (
                <li key={item} className="flex gap-3 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <PricingCard onBuy={onBuy} />
        </TabsContent>

        <TabsContent value="curriculum" className="mt-5">
          <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-soft">
            {CURRICULUM.map((module) => (
              <div key={module.week} className="grid gap-1 p-5 sm:grid-cols-[9rem_minmax(0,1fr)]">
                <p className="text-sm font-semibold text-muted-foreground">{module.week}</p>
                <div className="min-w-0">
                  <p className="font-display font-bold">{module.title}</p>
                  <p className="text-sm text-muted-foreground">{module.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="instructor" className="mt-5">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar className="h-16 w-16 shrink-0">
                <AvatarFallback className="bg-ink text-lg font-bold text-ink-foreground">
                  AC
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-bold">Abhiraj Chandrawanshi</p>
                <p className="text-sm text-muted-foreground">
                  Full-stack engineer · 8 years shipping products
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              I've built and scaled products used by millions, mentored 12,000+ learners, and every
              lesson here comes from real production work — not slides.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-5 grid gap-4 sm:grid-cols-2">
          {REVIEWS.map((review) => (
            <div
              key={review.name}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft"
            >
              <div className="flex text-brand-foreground">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-3 text-sm">{review.text}</p>
              <p className="mt-4 text-sm font-semibold">{review.name}</p>
              <p className="text-xs text-muted-foreground">{review.role}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="faqs" className="mt-5">
          <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-soft">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group p-5">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold">
                  {faq.q}
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PricingCard({ onBuy }: { onBuy: () => void }) {
  return (
    <div className="grid gap-5 rounded-2xl border border-border bg-card p-6 shadow-soft sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Early-bird pricing
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <span className="font-display text-4xl font-bold">₹{PRICE.toLocaleString("en-IN")}</span>
          <span className="text-lg text-muted-foreground line-through">
            ₹{ORIGINAL_PRICE.toLocaleString("en-IN")}
          </span>
          <Badge className="bg-success text-success-foreground hover:bg-success">62% off</Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          One-time payment · Lifetime access · 7-day refund
        </p>
      </div>
      <Button variant="brand" size="xl" onClick={onBuy} className="w-full sm:w-auto">
        Buy Now
      </Button>
    </div>
  );
}

function useCountdown(days: number) {
  const [remaining, setRemaining] = useState(days * 24 * 60 * 60);
  useEffect(() => {
    const id = window.setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, []);
  return {
    days: Math.floor(remaining / 86400),
    hours: Math.floor((remaining % 86400) / 3600),
    minutes: Math.floor((remaining % 3600) / 60),
    seconds: remaining % 60,
  };
}

function Sidebar({ onBuy }: { onBuy: () => void }) {
  const time = useCountdown(8);

  return (
    <aside className="min-w-0 space-y-5 lg:sticky lg:top-24 lg:self-start">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lift">
        <div className="bg-ink px-5 py-3 text-ink-foreground">
          <p className="text-sm font-semibold">
            <span className="mr-1 rounded-md bg-brand px-1.5 py-0.5 font-display text-brand-foreground">
              {time.days}
            </span>
            Days Left on this offer
          </p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: "Days", value: time.days },
              { label: "Hrs", value: time.hours },
              { label: "Min", value: time.minutes },
              { label: "Sec", value: time.seconds },
            ].map((unit) => (
              <div key={unit.label} className="rounded-xl bg-secondary py-2">
                <p className="font-display text-lg font-bold">
                  {String(unit.value).padStart(2, "0")}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {unit.label}
                </p>
              </div>
            ))}
          </div>

          <Separator className="my-5" />

          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-11 w-11 shrink-0">
              <AvatarFallback className="bg-brand text-sm font-bold text-brand-foreground">
                AC
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold">Abhiraj Chandrawanshi</p>
              <p className="truncate text-xs text-muted-foreground">
                abhirajchandrawanshi18@gmail.com
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">
            <BadgeCheck className="h-4 w-4" /> You've Registered
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-display text-3xl font-bold">₹{PRICE.toLocaleString("en-IN")}</span>
          <span className="text-sm text-muted-foreground line-through">
            ₹{ORIGINAL_PRICE.toLocaleString("en-IN")}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Price rises when the timer hits zero.</p>
        <Button variant="brand" size="lg" className="mt-4 w-full" onClick={onBuy}>
          Buy Now
        </Button>
        <Button variant="outline" size="lg" className="mt-2 w-full">
          <ShoppingCart className="h-4 w-4" /> Add to Cart
        </Button>
      </div>
    </aside>
  );
}

function Footer() {
  return (
    <footer className="mt-8 border-t border-border bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="min-w-0">
          <p className="font-display text-lg font-bold">Abhiraj Chandrawanshi</p>
          <p className="mt-2 max-w-sm text-sm text-ink-foreground/70">
            Practical, mentor-led tech courses for students and early-career engineers in India.
          </p>
          <div className="mt-5 flex gap-2">
            {[Linkedin, Instagram, Twitter, Youtube].map((Icon, i) => (
              <a
                key={i}
                href="#top"
                aria-label="Social link"
                className="grid h-9 w-9 place-items-center rounded-lg bg-ink-foreground/10 transition-colors hover:bg-brand hover:text-brand-foreground"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <nav className="grid grid-cols-2 gap-2 text-sm">
          {["About", "Contact", "Terms", "Privacy", "Courses", "Refunds"].map((link) => (
            <a key={link} href="#top" className="text-ink-foreground/70 hover:text-brand">
              {link}
            </a>
          ))}
        </nav>

        <div className="min-w-0">
          <p className="font-semibold">Get free workshop invites</p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              (event.currentTarget as HTMLFormElement).reset();
            }}
          >
            <label htmlFor="newsletter" className="sr-only">
              Email address
            </label>
            <Input
              id="newsletter"
              type="email"
              required
              maxLength={255}
              placeholder="you@example.com"
              className="border-ink-foreground/20 bg-ink-foreground/10 text-ink-foreground placeholder:text-ink-foreground/50"
            />
            <Button type="submit" variant="brand" aria-label="Subscribe">
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-3 flex items-center gap-2 text-xs text-ink-foreground/60">
            <Mail className="h-3.5 w-3.5" /> abhirajchandrawanshi18@gmail.com
          </p>
        </div>
      </div>
      <div className="border-t border-ink-foreground/10 py-5 text-center text-xs text-ink-foreground/60">
        © 2026 Abhiraj Chandrawanshi. All rights reserved.
      </div>
    </footer>
  );
}
