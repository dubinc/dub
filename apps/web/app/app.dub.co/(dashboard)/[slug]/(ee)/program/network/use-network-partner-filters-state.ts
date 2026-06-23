"use client";

import { parseReachTiers } from "@/lib/api/network/reach-tiers";
import { useRouterStuff } from "@dub/ui";
import { PlatformType } from "@prisma/client";
import { useMemo } from "react";
import {
  getContentSearchPlatforms,
  isAllPlatformsSelected,
  parseSelectedPlatforms,
  platformFilterParam,
} from "./platform-filter-utils";

// Filter changes update the URL instantly (snappy controls) but the data fetch is
// debounced avoiding ranking SQL + Voyage embed+rerank call.
export const FILTER_FETCH_DEBOUNCE_MS = 250;

// keeps the prior results on screen during the brief wait.
export function useNetworkPartnerFiltersState() {
  const { searchParams, queryParams } = useRouterStuff();

  const selectedPlatforms = useMemo(
    () => parseSelectedPlatforms(searchParams.get("platform")),
    [searchParams],
  );
  const platformFilter = platformFilterParam(selectedPlatforms);
  // The content-searchable subset of the selection. Semantic search runs only
  // when at least one searchable platform is selected; otherwise we fall back to
  // the ranked partner list (filtered to the chosen platforms).
  const contentSearchPlatforms = getContentSearchPlatforms(selectedPlatforms);
  const selectedReach = useMemo(
    () => parseReachTiers(searchParams.get("reach")),
    [searchParams],
  );
  const reachFilter = selectedReach.length ? selectedReach : undefined;
  const search = searchParams.get("search")?.trim() ?? "";
  const country = searchParams.get("country") ?? undefined;
  const starred = searchParams.get("starred") === "true";

  // Filter updates use history.pushState instead of router.push. Params only
  // drive client-side SWR — page.tsx doesn't read them — so router.push would
  // add an RSC round-trip for no gain. SWR refetches when the URL key changes.
  const updateSearchParams = (opts: {
    set?: Record<string, string | string[]>;
    del?: string | string[];
  }) => {
    const newPath = queryParams({ ...opts, getNewPath: true }) as string;
    window.history.pushState(null, "", newPath);
  };

  const onPlatformsChange = (platforms: PlatformType[]) =>
    updateSearchParams(
      isAllPlatformsSelected(platforms)
        ? { del: ["platform", "page"] }
        : { set: { platform: platforms.join(",") }, del: "page" },
    );

  return {
    selectedPlatforms,
    platformFilter,
    contentSearchPlatforms,
    reachFilter,
    search,
    country,
    starred,
    updateSearchParams,
    onPlatformsChange,
  };
}
