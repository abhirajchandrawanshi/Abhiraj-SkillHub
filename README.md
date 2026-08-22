# Abhiraj Chandrawanshi Course Hub

Build a modern, responsive landing page for an online course-selling platform called "Abhiraj Chandrawanshi ". The design should feel clean, professional, and trustworthy — similar to platforms like Unstop or Udemy.

Layout requirements:

Top Navigation Bar: Logo on the left, center nav links (Home, Courses, About, Reviews, FAQs), a notification bell icon and profile avatar on the right.

Hero Banner Section: Full-width colorful banner (use a bold accent color like lime green, teal, or navy) featuring:

Bold headline (e.g., "Master New Skills. Build Your Future.")

Subheadline describing the course/program

A large CTA button ("Enroll Now" / "Buy Course")

An illustration or image on the right side

Small badges in the corners (like a partner/brand logo)

Info Bar below the hero: a collapsible notice/announcement strip (e.g., "Limited Seats Left!" or "Follow us on social media").

Main Content Area (left, ~70% width):

Course title, rating, and short description

Tabs: Overview | Curriculum | Instructor | Reviews | FAQs

Course details card with icons (duration, mode: online, certificate, language)

"What you'll learn" bullet list

Pricing card with original price (strikethrough), discounted price, and a prominent "Buy Now" / "Enroll Now" button

Sidebar (right, ~30% width):

A sticky card showing: countdown timer (e.g., "8 Days Left" for an offer), instructor/seller profile with avatar and email/contact, and a status badge (e.g., "You've Registered" / "Enrolled")

Below it, a secondary card showing price, "Add to Cart" and "Buy Now" buttons

Payment Integration: Add a functional checkout flow — clicking "Buy Now" should open a payment modal/page collecting name, email, and payment details (integrate Stripe or Razorpay checkout as a placeholder).

Footer: Standard footer with links (About, Contact, Terms, Privacy), social icons, and newsletter signup.

Style: Use a modern SaaS aesthetic — rounded cards, soft shadows, clear typography hierarchy, generous white space, and one bold accent color for CTAs. Fully responsive for mobile and desktop.(I have attached a picture for your reference )

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://vivid-academy-glow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2ff9fe29-7a66-4101-aaeb-49da09856a01).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Razorpay setup

The checkout uses Razorpay Orders and hosted Checkout. Configure these server-side environment
variables before running the app or deploying it:

```sh
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

Copy `.env.example` to `.env` and paste your keys. Create credentials in the Razorpay Dashboard
(Settings → API Keys). Use **test** keys (`rzp_test_...`) for local development.

Never expose `RAZORPAY_KEY_SECRET` as a `VITE_*` variable or commit it to the repository.

Restart `npm run dev` after changing `.env`. Test payments with Razorpay test cards / UPI
(success: `ACCT-000006`). The course is currently charged at ₹1 for gateway testing.
