import { Link } from "@tanstack/react-router";
import { Instagram, Linkedin, Mail, Send, Twitter, Youtube } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FOOTER_LINKS = [
  { label: "About", to: "/about" },
  { label: "Courses", to: "/courses" },
  { label: "Reviews", to: "/reviews" },
  { label: "FAQs", to: "/faqs" },
  { label: "1:1 Session", to: "/one-on-one" },
  { label: "Contact", to: "/about" },
] as const;

export function SiteFooter() {
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
                href="https://www.linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Social link"
                className="grid h-9 w-9 place-items-center rounded-lg bg-ink-foreground/10 transition-colors hover:bg-brand hover:text-brand-foreground"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <nav className="grid grid-cols-2 gap-2 text-sm">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.label} to={link.to} className="text-ink-foreground/70 hover:text-brand">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="min-w-0">
          <p className="font-semibold">Get free workshop invites</p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              event.currentTarget.reset();
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
