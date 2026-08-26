import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useCourseAccess } from "@/hooks/use-course-access";
import { COURSE_PRICE_INR, INTERNSHIP_ID } from "@/lib/course";

export const NAV_LINKS = [
  { label: "Home", to: "/", hash: "" },
  { label: "Course", to: "/", hash: "course" },
  { label: "About", to: "/", hash: "about" },
  { label: "Reviews", to: "/", hash: "reviews" },
  { label: "FAQs", to: "/", hash: "faqs" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { access } = useCourseAccess(INTERNSHIP_ID);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 lg:grid-cols-[auto_1fr_auto]">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="truncate font-display text-base font-bold sm:text-lg">
            Abhiraj Courses
          </span>
        </Link>

        <nav className="hidden justify-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              hash={link.hash || undefined}
              activeOptions={{ exact: link.to === "/" && !link.hash }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {access ? (
            <Button variant="brand" size="sm" asChild>
              <Link to="/learn">Continue</Link>
            </Button>
          ) : (
            <Button variant="brand" size="sm" asChild>
              <Link to="/" hash="enroll">
                Enroll · ₹{COURSE_PRICE_INR}
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            aria-expanded={open}
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {open ? (
        <nav className="grid gap-1 border-t border-border bg-background px-4 py-3 lg:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              hash={link.hash || undefined}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to={access ? "/learn" : "/"}
            hash={access ? undefined : "enroll"}
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2 text-sm font-semibold"
          >
            {access ? "Open classroom" : `Enroll — ₹${COURSE_PRICE_INR}`}
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
