import { useEffect, useState } from "react";

import { COURSE_ACCESS_EVENT, hasCourseAccess, readCourseAccess, type CourseAccess } from "@/lib/access";

export function useCourseAccess() {
  const [access, setAccess] = useState<CourseAccess | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setAccess(readCourseAccess());
      setReady(true);
    };
    sync();
    window.addEventListener(COURSE_ACCESS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(COURSE_ACCESS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { access, ready, enrolled: hasCourseAccess() && access !== null };
}
