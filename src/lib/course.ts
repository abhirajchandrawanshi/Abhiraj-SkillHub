export const COURSE_ID = "python";
export const COURSE_TITLE = "Python Notes / Python course";
export const COURSE_SUBTITLE =
  "A 16-week, project-first program — ship six products, get code reviewed, and leave with a portfolio recruiters actually read.";
/** Charged amount in INR. Server uses this — never trust a client-sent price. */
export const COURSE_PRICE_INR = 1;

export const INTERNSHIP_ID = "internships";
export const INTERNSHIP_TITLE = "100+ Paid Internships";
export const INTERNSHIP_SUBTITLE =
  "Curated list of 100+ paid internship opportunities in top companies with complete application details.";
/** Charged amount in INR. Server uses this — never trust a client-sent price. */
export const INTERNSHIP_PRICE_INR = 5;

export const TESTING_ID = "testing";
export const TESTING_TITLE = "Payment & Access Testing";
export const TESTING_SUBTITLE =
  "DO NOT PAY this is for testing purpose";
/** Charged amount in INR. Server uses this — never trust a client-sent price. */
export const TESTING_PRICE_INR = 1;

export const COURSE_DETAILS = [
  { label: "Duration", value: "16 weeks · 120 hrs" },
  { label: "Mode", value: "Online · Live + recorded" },
  { label: "Certificate", value: "Verified, shareable" },
  { label: "Language", value: "English & Hindi" },
] as const;

export const LEARN_OUTCOMES = [
  "Build production React apps with TypeScript and modern tooling",
  "Design REST and realtime APIs backed by PostgreSQL",
  "Authentication, roles and row-level security done properly",
  "Testing, CI/CD and deploying to the edge",
  "System design fundamentals for interviews",
  "Portfolio, résumé and mock-interview coaching",
];

export type Lesson = {
  id: string;
  title: string;
  minutes: number;
  preview?: boolean;
  body: string[];
};

export type Module = {
  id: string;
  week: string;
  title: string;
  desc: string;
  lessons: Lesson[];
};

export const COURSE_MODULES: Module[] = [
  {
    id: "foundations",
    week: "Weeks 1–3",
    title: "Foundations",
    desc: "JavaScript deep dive, Git, HTML/CSS systems.",
    lessons: [
      {
        id: "welcome",
        title: "Welcome & how this cohort works",
        minutes: 8,
        preview: true,
        body: [
          "Welcome to the Full-Stack Career Accelerator. This is a build-first program: every week you ship something you can show in an interview.",
          "Live sessions happen twice a week. Recordings, notes and starter repos stay available for life after you enroll.",
          "Your first job is simple — finish this orientation, install the toolchain in the next lesson, and introduce yourself in the cohort chat.",
        ],
      },
      {
        id: "js-mental-models",
        title: "JavaScript mental models",
        minutes: 24,
        body: [
          "We start with how JS actually runs: the call stack, closures, and why `this` surprises people in interviews.",
          "You will rewrite a messy tutorial script into small functions with clear inputs and outputs — the same habit you will use in React later.",
          "Assignment: explain event loop order for a snippet with promises, timeouts and a microtask. Post your answer before the live session.",
        ],
      },
      {
        id: "git-workflow",
        title: "Git workflow used in teams",
        minutes: 18,
        body: [
          "Feature branches, pull requests, and commit messages that a teammate can review in 60 seconds.",
          "You will open a PR on the course starter, respond to a review comment, and squash only when asked.",
        ],
      },
    ],
  },
  {
    id: "frontend",
    week: "Weeks 4–7",
    title: "Frontend craft",
    desc: "React, TypeScript, state, design systems.",
    lessons: [
      {
        id: "react-typescript",
        title: "React + TypeScript without the pain",
        minutes: 32,
        body: [
          "Type props, events and server data so the compiler catches bugs before QA does.",
          "We build a job-board UI with loading, empty and error states — the three screens most portfolios skip.",
        ],
      },
      {
        id: "state-data",
        title: "State, data fetching and forms",
        minutes: 28,
        body: [
          "Local state vs server state. You will fetch a list, mutate it, and keep the UI consistent without a spaghetti of useEffects.",
          "Project checkpoint: a filterable course catalog with URL search params.",
        ],
      },
    ],
  },
  {
    id: "backend",
    week: "Weeks 8–11",
    title: "Backend & data",
    desc: "APIs, Postgres, auth, background jobs.",
    lessons: [
      {
        id: "api-design",
        title: "REST APIs you can defend in a review",
        minutes: 30,
        body: [
          "Status codes, pagination, and errors that the frontend can actually display.",
          "You will design enroll and payment-status endpoints — the same shape used after Razorpay verifies a payment.",
        ],
      },
      {
        id: "auth-postgres",
        title: "Auth and Postgres the right way",
        minutes: 34,
        body: [
          "Sessions, hashed secrets, and row-level rules so one learner cannot read another learner's progress.",
          "Lab: store course access after a verified payment id, never after the checkout popup alone.",
        ],
      },
    ],
  },
  {
    id: "ship",
    week: "Weeks 12–14",
    title: "Ship it",
    desc: "Testing, CI/CD, observability, deployment.",
    lessons: [
      {
        id: "testing-ci",
        title: "Tests and a pipeline that blocks bad merges",
        minutes: 26,
        body: [
          "Unit tests for pricing and access logic. A smoke test that the learn page stays locked without a grant.",
          "CI runs on every PR. You do not merge red builds — same rule as a real team.",
        ],
      },
      {
        id: "deploy",
        title: "Deploy and watch it in production",
        minutes: 22,
        body: [
          "Ship the app, add basic logs around payments, and write a one-page runbook for when checkout fails.",
        ],
      },
    ],
  },
  {
    id: "career",
    week: "Weeks 15–16",
    title: "Career sprint",
    desc: "Portfolio, résumé, mock interviews.",
    lessons: [
      {
        id: "portfolio",
        title: "Portfolio that tells a hiring story",
        minutes: 20,
        body: [
          "Three projects, each with problem, constraints, your decisions, and a demo link. No tutorial clones without a twist.",
        ],
      },
      {
        id: "mocks",
        title: "Mock interviews and offer week",
        minutes: 40,
        body: [
          "DSA-lite plus system design for a course platform: orders, webhooks, and access grants.",
          "You leave with a résumé pass, two recorded mocks, and a referral checklist.",
        ],
      },
    ],
  },
];

export const COURSE_REVIEWS = [
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

export const COURSE_FAQS = [
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
  {
    q: "When do I get access after paying?",
    a: "Immediately. Razorpay verifies the payment on the server, then this browser unlocks the classroom.",
  },
];

export const PREVIEW_LESSON = COURSE_MODULES[0].lessons[0];

export function allLessons() {
  return COURSE_MODULES.flatMap((module) =>
    module.lessons.map((lesson) => ({ ...lesson, moduleId: module.id, moduleTitle: module.title })),
  );
}

export function findLesson(lessonId: string) {
  return allLessons().find((lesson) => lesson.id === lessonId) ?? allLessons()[0];
}
