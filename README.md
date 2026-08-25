# Abhiraj Chandrawanshi Course Hub

Build a modern, responsive landing page for an online course-selling platform called "Abhiraj Chandrawanshi ". The design should feel clean, professional, and trustworthy.

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

## Git ignore and secret safety

The repository already excludes local secrets and generated artifacts through `.gitignore`.

Ignored categories:

- Local environment files: `.env`, `.env.*` (except `.env.example`)
- Cloudflare local vars: `.dev.vars`
- Build outputs and generated folders: `dist`, `dist-ssr`, `.output`, `.vinxi`, `.tanstack/**`, `.nitro`
- Tooling and dependencies: `node_modules`
- Local editor/system files: `.vscode/*` (except `.vscode/extensions.json`), `.idea`, `.DS_Store`, `*.suo`, `*.ntvs*`, `*.njsproj`, `*.sln`, `*.sw?`

Before sharing the repo, keep real credentials only in local `.env` and never commit that file.

## Environment placeholders

Use these placeholder variable names in `.env` (see `.env.example`):

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## 60-second handoff checklist

1. Clone the repo and install dependencies:

```sh
git clone <repo-url>
cd vivid-academy-glow
npm i
```

2. Create local env file from template:

```sh
cp .env.example .env
```

3. Fill all placeholders in `.env` with real values (never commit `.env`).

4. Start development server:

```sh
npm run dev
```

5. Validate production build before opening PR:

```sh
npm run build
```
