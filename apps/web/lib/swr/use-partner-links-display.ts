"use client";

import { useSyncedLocalStorage } from "@/lib/hooks/use-synced-local-storage";
import { useMemo } from "react";

export type PartnerLinksViewMode = "cards" | "rows";

export function usePartnerLinksDisplay({
  linksCount,
  showDetailedAnalytics,
}: {
  linksCount?: number;
  showDetailedAnalytics?: boolean;
} = {}) {
  const [preferTitle, setPreferTitle] = useSyncedLocalStorage(
    "partnerLinksDisplayPreferTitle",
    false,
  );

  const [persistedViewMode, setViewMode] =
    useSyncedLocalStorage<PartnerLinksViewMode | null>(
      "partnerLinksViewMode",
      null,
    );

  const viewMode = useMemo<PartnerLinksViewMode>(() => {
    if (persistedViewMode === "cards" || persistedViewMode === "rows") {
      return persistedViewMode;
    }

    if ((linksCount && linksCount > 5) || !showDetailedAnalytics) return "rows";
    return "cards";
  }, [persistedViewMode, linksCount, showDetailedAnalytics]);

  return {
    preferTitle,
    setPreferTitle,
    viewMode,
    setViewMode,
  };
}
