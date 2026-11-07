# AbhiAcademy — Course Selling Platform

A full-stack, production-ready online course marketplace built with **TanStack Start**, **Firebase**, **Razorpay**, and **Brevo**. Features a polished public storefront, a fully secured admin panel, cart/checkout flow, email notifications, PDF certificate delivery, and Supabase-backed signed asset URLs.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Features](#features)
   - [Public Storefront](#public-storefront)
   - [Authentication](#authentication)
   - [Cart & Checkout](#cart--checkout)
   - [Payment Integration](#payment-integration)
   - [Email Notifications](#email-notifications)
   - [User Profile](#user-profile)
   - [Admin Panel](#admin-panel)
   - [Firestore Security Rules](#firestore-security-rules)
4. [Getting Started](#getting-started)
5. [Environment Variables](#environment-variables)
6. [Admin Setup](#admin-setup)
7. [Utility Scripts](#utility-scripts)
8. [Deployment](#deployment)
9. [Security & Git Safety](#security--git-safety)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, file-based routing) |
| Bundler | Vite 8 |
| Styling | Tailwind CSS v4 + `tw-animate-css` |
| UI Components | Radix UI primitives + custom shadcn-style components |
| Animations | Framer Motion, tsParticles, KineticGrid, SparklesCore |
| Auth | Firebase Authentication (email/password) |
| Database | Cloud Firestore |
| Storage | Supabase Storage (signed PDF/asset URLs) |
| Payments | Razorpay Orders API + Hosted Checkout |
| Email | Brevo (Sendinblue) Transactional API |
| Admin SDK | Firebase Admin SDK (server-side only) |
| Forms | React Hook Form + Zod |
| State/Data | TanStack Query v5 |
| Language | TypeScript 5 |

---

## Project Structure

```
src/
├── routes/
│   ├── __root.tsx          # Root layout, AuthProvider, QueryClient, Sonner toaster
│   ├── index.tsx           # Main landing page (full storefront)
│   ├── login.tsx           # Login / Sign-up page
│   ├── profile.tsx         # User profile & settings page
│   └── admin/
│       ├── route.tsx       # Admin layout wrapper (auth guard)
│       ├── login.tsx       # Admin login page
│       ├── dashboard.tsx   # Stats dashboard (courses, users, revenue)
│       ├── courses.tsx     # Course management (CRUD)
│       └── offers.tsx      # Bundle offer management
│
├── components/
│   ├── ThemeToggle.tsx
│   ├── course/
│   │   ├── CartDrawer.tsx       # Slide-in cart with bundle offer logic
│   │   ├── CheckoutDialog.tsx   # Multi-step checkout modal
│   │   └── CourseFormDialog.tsx # Admin create/edit course form
│   ├── layout/
│   │   ├── AdminShell.tsx  # Admin sidebar + header shell
│   │   ├── SiteHeader.tsx
│   │   └── SiteFooter.tsx
│   └── ui/                 # All reusable UI primitives (shadcn + custom)
│
├── features/
│   ├── auth/
│   │   ├── auth-provider.tsx    # Firebase Auth context/provider
│   │   ├── use-auth.tsx         # useAuth hook
│   │   └── use-admin-auth.tsx   # Admin-specific auth hook
│   ├── cart/
│   │   └── use-cart.tsx         # Cart context + CartProvider
│   └── courses/
│       ├── use-course-access.ts          # Per-course access hook
│       └── use-dynamic-course-access.ts  # Multi-course dynamic access hook
│
├── services/
│   ├── access/
│   │   ├── access.ts          # Read/write courseAccess Firestore records
│   │   ├── courseAccess.ts    # Course access helpers
│   │   └── admin-server.ts    # Server-side admin access management
│   ├── auth/
│   │   └── email-change-server.ts  # OTP-gated email change flow (server fn)
│   ├── database/
│   │   ├── firebase.ts           # Firebase client SDK init
│   │   ├── firebase-admin.ts     # Firebase Admin SDK init (server-only)
│   │   ├── firebase-courses.ts   # Course CRUD + ratings + suggestions
│   │   ├── public-server.ts      # Server functions: published courses, private access
│   │   ├── admin.ts              # Admin CRUD server functions (courses, offers, stats)
│   │   └── user-profile.ts       # User profile read/write (Firestore userProfiles)
│   ├── email/
│   │   └── brevo.ts              # Brevo email server function (purchase confirmation + PDF)
│   ├── payments/
│   │   ├── razorpay.ts           # Razorpay order creation + verification server fns
│   │   └── load-razorpay.ts      # Dynamic Razorpay script loader
│   └── storage/
│       └── supabase-server.ts    # Supabase signed URL generation (server fn)
│
├── hooks/
│   ├── use-theme.tsx   # Dark/light mode with localStorage persistence
│   └── use-mobile.tsx  # Responsive breakpoint hook
│
├── lib/
│   ├── bundle-offers.ts          # Bundle offer types + discount logic
│   ├── course.ts                 # Course type definitions & helpers
│   ├── utils.ts                  # cn() utility
│   ├── error-capture.ts          # Error capture utilities
│   └── runtime-error-reporting.ts
│
└── styles.css          # Global CSS variables, design tokens, animations

scripts/                # Node.js utility scripts (tsx)
firestore.rules         # Firestore security rules
firestore.indexes.json
firebase.json
```

---

## Features

### Public Storefront

The main landing page (`/`) is a fully featured, animated course marketplace:

- **Animated Hero** — Framer Motion entry animations, `SparklesCore` particle background, `KineticGrid` interactive mesh
- **Course Catalog** — Fetches published courses server-side via `getPublishedCoursesServer`; cards display thumbnail, title, instructor, rating, price (with discount if active offer applies)
- **Course Detail** — Tabbed detail view: Overview, Curriculum, Instructor, Reviews, FAQs
- **Star Ratings** — Users can rate courses; ratings persist to Firestore `courseRatings` and to `localStorage` to prevent duplicates
- **Suggestions / Feedback** — Feedback card widget that submits to Firestore `suggestions`
- **Announcement Bar** — Dismissable info strip at top of page
- **Dark / Light Mode** — Full theme toggle with system preference detection
- **Responsive Navigation** — Mobile hamburger menu with animated drawer
- **User Dropdown** — Authenticated user avatar with profile link, sign-out, theme toggle

### Authentication

- Firebase Authentication (email + password)
- `AuthProvider` wraps the entire app and exposes `useAuth()` hook
- Protected routes redirect unauthenticated users to `/login`
- Admin routes use a separate `useAdminAuth()` hook verified against Firebase custom claims / email allowlist
- OTP-gated email change flow on the profile page (6-digit OTP sent via Brevo, verified server-side)

### Cart & Checkout

- **CartProvider** / `useCart()` — Global cart state with add/remove, quantity management
- **CartDrawer** — Animated slide-in drawer listing cart items; applies bundle offer discounts automatically
- **Bundle Offers** — Firestore `bundleOffers` collection; offers define eligible course sets and discount rules
- **CheckoutDialog** — Multi-step modal:
  1. Review order + applied discounts
  2. Collect buyer name & email (pre-filled for logged-in users)
  3. Razorpay hosted checkout
  4. Post-payment verification + access grant

### Payment Integration

Powered by **Razorpay**:

- Server function creates a Razorpay Order (`createRazorpayOrder`)
- Client loads Razorpay script dynamically (`load-razorpay.ts`)
- After payment, a server function verifies the HMAC signature (`verifyRazorpayPayment`)
- On success: writes `courseAccess` + `enrollments` records to Firestore, triggers confirmation email

Test with Razorpay test keys (`rzp_test_...`). Use test card `4111 1111 1111 1111` or UPI ID `success@razorpay`.

### Email Notifications

Powered by **Brevo** (Sendinblue) transactional API:

- Sends a styled HTML purchase confirmation email after successful payment
- Fetches course details server-side (via Firebase Admin SDK) to populate the email
- Attaches or links a signed PDF certificate/material URL from Supabase Storage
- User notification preference (on/off) stored in Firestore `userProfiles` and respected before sending

### User Profile

Route `/profile`:

- Edit display name
- OTP-verified email address change (server-side flow)
- Toggle email notification preference
- Sign-out button
- Redirects to login if unauthenticated

### Admin Panel

Protected under `/admin/*`, requiring admin Firebase account:

| Route | Description |
|---|---|
| `/admin/login` | Dedicated admin login |
| `/admin/dashboard` | Real-time stats: total courses, published, users, purchases, revenue |
| `/admin/courses` | Full course CRUD — create, edit, publish/draft toggle, delete |
| `/admin/offers` | Bundle offer management — create discount deals linking multiple courses |

**AdminShell** provides a collapsible sidebar with navigation and a top header bar.

**`CourseFormDialog`** supports:
- Title, description, instructor, price, discount price
- Curriculum editor (add/remove modules and lessons)
- Thumbnail URL
- Status toggle (draft / published)
- PDF / material URL for post-purchase delivery

**Dashboard stats** auto-refresh every 60 seconds via TanStack Query `refetchInterval`.

### Firestore Security Rules

`firestore.rules` enforces least-privilege access:

| Collection | Read | Write |
|---|---|---|
| `courses` | Published: public. Drafts: admin only | Admin only |
| `courseAccess` | Owner (by UID or email) or admin | Admin only |
| `enrollments` | Owner or admin | Admin only |
| `bundleOffers` | Public | Admin only |
| `suggestions` | Admin only | Anyone (create) |
| `courseRatings` | Public | Anyone (create/read) |
| `userProfiles` | Owner only | Owner only |
| `adminUsers` | No direct access | No direct access |

---

## Getting Started

### Prerequisites

- Node.js 20+ (or use [nvm](https://github.com/nvm-sh/nvm))
- A Firebase project with Firestore + Authentication enabled
- A Razorpay account (test keys for local dev)
- A Brevo account + API key
- A Supabase project with a storage bucket for PDF assets

### Install & Run

```sh
git clone <repo-url>
cd abhiraj-courses
npm install
cp .env.example .env
# Fill in all values in .env (see below)
npm run dev
```

The dev server starts at `http://localhost:5174` by default.

---

## Environment Variables

Copy `.env.example` → `.env` and populate all values. **Never commit `.env`.**

```sh
# Razorpay
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...

# Firebase Client SDK (safe to expose via VITE_)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Brevo Email
BREVO_API_KEY=
WEBSITE_URL=http://localhost:5174

# Admin setup (only needed for setup script, not runtime)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=

# Firebase Admin SDK (server-side only — never prefix with VITE_)
FIREBASE_ADMIN_TYPE=service_account
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_PRIVATE_KEY_ID=
FIREBASE_ADMIN_PRIVATE_KEY=        # Full PEM key, newlines as \n
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_CLIENT_ID=
FIREBASE_ADMIN_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_ADMIN_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_ADMIN_CLIENT_X509_CERT_URL=
FIREBASE_ADMIN_UNIVERSE_DOMAIN=googleapis.com
```

> **Important:** `FIREBASE_ADMIN_PRIVATE_KEY` and `RAZORPAY_KEY_SECRET` are server-only secrets. Never prefix them with `VITE_`.

---

## Admin Setup

Use the setup script to create the initial admin account and set Firebase custom claims:

```sh
npm run setup-admin
```

Or use the helper for additional admin operations:

```sh
npm run admin-helper
```

---

## Utility Scripts

All scripts live in `scripts/` and run with `tsx`:

| Script | Command | Description |
|---|---|---|
| `setup-admin-simple.ts` | `npm run setup-admin` | Creates admin user + sets custom claims |
| `admin-helper.ts` | `npm run admin-helper` | General admin account helper |
| `check-firestore-courses.ts` | `npm run check-courses` | Inspect Firestore courses collection |
| `seed-courses.ts` | `tsx scripts/seed-courses.ts` | Seed initial course data |
| `migrate-thumbnails.ts` | `tsx scripts/migrate-thumbnails.ts` | Migrate thumbnail URLs |
| `add-courses-admin-sdk.ts` | `tsx scripts/add-courses-admin-sdk.ts` | Bulk-add courses via Admin SDK |

---

## Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for full deployment instructions.

Quick summary:

```sh
npm run build      # Production build to dist/
npm run preview    # Preview production build locally
```

Deploy `dist/` to any static host (Vercel, Netlify, Firebase Hosting, Cloudflare Pages). TanStack Start server functions require a Node.js-capable host or edge runtime.

Set all environment variables from the [Environment Variables](#environment-variables) section in your hosting dashboard.

---

## Security & Git Safety

`.gitignore` excludes:

- `.env`, `.env.*` (except `.env.example`)
- `.dev.vars` (Cloudflare local secrets)
- `dist/`, `.output/`, `.vinxi/`, `.tanstack/`, `.nitro/`
- `node_modules/`
- Editor files: `.vscode/*` (except `.vscode/extensions.json`), `.idea`, `.DS_Store`

**Rules of thumb:**
- Only `VITE_*` variables are safe to expose to the browser bundle.
- All Razorpay secret keys, Firebase Admin SDK credentials, and Brevo API keys must stay server-side only.
- Firestore security rules (`firestore.rules`) enforce least-privilege access at the database level. Deploy with:

```sh
firebase deploy --only firestore:rules
```
