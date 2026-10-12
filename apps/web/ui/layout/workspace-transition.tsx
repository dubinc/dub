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
  useState,
  type ReactNode,
} from "react";

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

  const isTransitioning = pendingSlug !== null;

  const startWorkspaceTransition = useCallback(
    (targetSlug: string) => {
      if (!targetSlug || targetSlug === currentSlug) {
        return;
      }
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

    // Let the banner + MainNav offset commit before revealing.
    const frame = requestAnimationFrame(() => {
      setPendingSlug(null);
    });

    return () => cancelAnimationFrame(frame);
  }, [pendingSlug, currentSlug, loading]);

  // Safety valve if navigation is cancelled or hangs.
  useEffect(() => {
    if (!pendingSlug) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setPendingSlug(null);
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
