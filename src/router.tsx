import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Public course data stays fresh for 5 minutes — reduces duplicate Firestore reads
        staleTime: 5 * 60 * 1000,
        // Keep unused query data in cache for 10 minutes
        gcTime: 10 * 60 * 1000,
        // Don't refetch just because the user switched tabs/windows
        refetchOnWindowFocus: false,
        // Don't refetch when the component re-mounts if data is still fresh (respects staleTime)
        refetchOnMount: true,
        // Retry once on failure, not three times
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
