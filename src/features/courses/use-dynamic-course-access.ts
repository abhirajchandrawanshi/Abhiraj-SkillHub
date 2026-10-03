import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/features/auth/use-auth";
import { checkFirestoreAccess, readCourseAccess } from "@/services/access/access";

/**
 * Optimized hook for checking course access.
 *
 * KEY OPTIMIZATION: Uses the centralized AuthProvider's user state instead of
 * creating a separate onAuthStateChanged listener per component instance.
 *
 * Before: Each CourseCard created its own Firebase Auth listener → N listeners
 * After:  Single AuthProvider listener, this hook just reads user from context
 *
 * Also adds simple caching to avoid redundant Firestore reads when the same
 * courseId is checked multiple times during a session.
 */

// Simple in-memory cache for access checks (avoids duplicate Firestore reads)
const accessCache = new Map<string, { result: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedAccess(key: string): boolean | null {
  const entry = accessCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    accessCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCachedAccess(key: string, result: boolean) {
  accessCache.set(key, { result, timestamp: Date.now() });
}

/** Clear access cache for a specific course (call after payment success) */
export function invalidateAccessCache(courseId?: string) {
  if (courseId) {
    // Clear all cache entries that include this courseId
    for (const key of accessCache.keys()) {
      if (key.includes(courseId)) {
        accessCache.delete(key);
      }
    }
  } else {
    accessCache.clear();
  }
}

export function useDynamicCourseAccess(courseId: string) {
  const [access, setAccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const { user, loading: authLoading } = useAuth();
  const checkedRef = useRef<string>(""); // Track what we've already checked

  // Check access when user state resolves
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // Avoid duplicate checks for the same user+course combination
    const checkKey = `${user?.uid || "guest"}:${courseId}`;
    if (checkedRef.current === checkKey && !loading) return;

    let cancelled = false;

    const checkAccess = async () => {
      // Check cache first
      const cached = getCachedAccess(checkKey);
      if (cached !== null) {
        if (!cancelled) {
          setAccess(cached);
          setLoading(false);
          checkedRef.current = checkKey;
        }
        return;
      }

      if (user) {
        try {
          const hasAccess = await checkFirestoreAccess(user.uid, courseId);
          const result = hasAccess !== null;
          if (!cancelled) {
            setAccess(result);
            setCachedAccess(checkKey, result);
          }
        } catch (error) {
          console.error("Error checking dynamic course access:", error);
          if (!cancelled) setAccess(false);
        }
      } else {
        // Check localStorage for guest access
        const guestAccess = readCourseAccess(courseId);
        const result = guestAccess !== null;
        if (!cancelled) {
          setAccess(result);
          setCachedAccess(checkKey, result);
        }
      }
      if (!cancelled) {
        setLoading(false);
        checkedRef.current = checkKey;
      }
    };

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [courseId, user, authLoading, loading]);

  // Listen for access changes (e.g., after payment)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleAccessChange = () => {
      // Invalidate cache for this course
      invalidateAccessCache(courseId);

      const currentAccess = readCourseAccess(courseId);
      setAccess(currentAccess !== null);
    };

    const event = `course-access-changed-${courseId}`;
    window.addEventListener(event, handleAccessChange);

    return () => {
      window.removeEventListener(event, handleAccessChange);
    };
  }, [courseId]);

  return { access, loading };
}
