import { COURSE_ID } from "@/lib/course";

export type CourseAccess = {
  email: string;
  paymentId: string;
  orderId: string;
  grantedAt: string;
};

const ACCESS_KEY = `course-access:${COURSE_ID}`;
const EMAIL_KEY = `course-access-email:${COURSE_ID}`;
const PROGRESS_KEY = `course-progress:${COURSE_ID}`;
export const COURSE_ACCESS_EVENT = "course-access-changed";

export function readCourseAccess(): CourseAccess | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ACCESS_KEY);
  if (!raw) return null;
  if (raw === "verified") {
    return {
      email: window.localStorage.getItem(EMAIL_KEY) ?? "",
      paymentId: "",
      orderId: "",
      grantedAt: "",
    };
  }
  try {
    const parsed = JSON.parse(raw) as CourseAccess;
    if (parsed && typeof parsed.email === "string") return parsed;
  } catch {
    return null;
  }
  return null;
}

export function hasCourseAccess() {
  return readCourseAccess() !== null;
}

export function grantCourseAccess(access: CourseAccess) {
  window.localStorage.setItem(ACCESS_KEY, JSON.stringify(access));
  window.localStorage.setItem(EMAIL_KEY, access.email);
  window.dispatchEvent(new Event(COURSE_ACCESS_EVENT));
}

export function readCompletedLessons(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROGRESS_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function toggleLessonComplete(lessonId: string) {
  const next = new Set(readCompletedLessons());
  if (next.has(lessonId)) next.delete(lessonId);
  else next.add(lessonId);
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify([...next]));
  return [...next];
}
