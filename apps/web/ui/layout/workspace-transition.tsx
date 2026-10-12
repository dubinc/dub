"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { LoadingSpinner } from "@dub/ui";
import { useParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Keep the shell covered long enough that cached exits (e.g. Exit staging) still feel intentional. */
const MIN_TRANSITION_MS = 400;

type WorkspaceTransitionContextValue = {
  /** Cover the dashboard shell until the destination workspace is ready. */
  startWorkspaceTransition: (targetSlug: string) => void;
  isTransitioning: boolean;
};

const WorkspaceTransitionContext =
  createContext<WorkspaceTransitionContextValue>({
    startWorkspaceTransition: () => {},
    isTransitioning: false,
  });

export function useWorkspaceTransition() {
  return useContext(WorkspaceTransitionContext);
}

/**
 * Stripe-style account switch: show a full-shell loader on workspace /
 * environment changes so the env banner and layout offset never snap mid-reveal.
 */
export function WorkspaceTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { slug: currentSlug } = useParams() as { slug?: string };
  const { loading } = useWorkspace();
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const startedAtRef = useRef<number | null>(null);

  const isTransitioning = pendingSlug !== null;

  const startWorkspaceTransition = useCallback(
    (targetSlug: string) => {
      if (!targetSlug || targetSlug === currentSlug) {
        return;
      }
      startedAtRef.current = Date.now();
      setPendingSlug(targetSlug);
    },
    [currentSlug],
  );

  useEffect(() => {
    if (!pendingSlug) {
      return;
    }

    // Still navigating to the destination workspace.
    if (currentSlug !== pendingSlug) {
      return;
    }

    // Destination slug is active but workspace data is still loading.
    if (loading) {
      return;
    }

    // Exit staging usually hits a warm SWR cache, so loading flips false
    // immediately — hold the overlay for a minimum so it matches Switch to staging.
    const startedAt = startedAtRef.current ?? Date.now();
    const remaining = Math.max(
      0,
      MIN_TRANSITION_MS - (Date.now() - startedAt),
    );

    const timeout = window.setTimeout(() => {
      // Let the banner + MainNav offset commit before revealing.
      requestAnimationFrame(() => {
        setPendingSlug(null);
        startedAtRef.current = null;
      });
    }, remaining);

    return () => window.clearTimeout(timeout);
  }, [pendingSlug, currentSlug, loading]);

  // Safety valve if navigation is cancelled or hangs.
  useEffect(() => {
    if (!pendingSlug) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setPendingSlug(null);
      startedAtRef.current = null;
    }, 10_000);

    return () => window.clearTimeout(timeout);
  }, [pendingSlug]);

  const value = useMemo(
    () => ({
      startWorkspaceTransition,
      isTransitioning,
    }),
    [startWorkspaceTransition, isTransitioning],
  );

  return (
    <WorkspaceTransitionContext.Provider value={value}>
      {children}
      {isTransitioning ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-white"
          aria-busy="true"
          aria-live="polite"
        >
          <LoadingSpinner />
        </div>
      ) : null}
    </WorkspaceTransitionContext.Provider>
  );
}
