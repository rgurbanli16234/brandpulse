import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { toast } from "sonner";

import { ApiError, describeError } from "./lib/api";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    // Failed loads already render an inline error note; this adds a single,
    // deduplicated toast so a broken request is never silent. 401s are handled
    // globally by signing the user out, and background refresh failures keep the
    // last good data on screen, so neither is toasted.
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (error instanceof ApiError && (error.status === 401 || error.status === 0)) return;
        if (query.state.data !== undefined) return;
        toast.error(describeError(error, "Request failed"), { id: "query-error" });
      },
    }),
    defaultOptions: {
      queries: {
        // Surface failures quickly instead of retrying three times with backoff.
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
