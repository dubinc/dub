import { isPartnerContentSearchPlatform } from "@/lib/partner-content-search/types";
import type { PlatformType } from "@prisma/client";

// Filterable platforms, in display order. All selected = no filter
export const NETWORK_FILTER_PLATFORMS = [
  "youtube",
  "instagram",
  "tiktok",
  "website",
  "twitter",
  "linkedin",
] as const satisfies readonly PlatformType[];

const PLATFORM_SET = new Set<string>(NETWORK_FILTER_PLATFORMS);

// Parse the comma-separated `platform` query param. Absent/empty means "all
// platforms" (no filter), which we represent as the full list so callers always
// get a concrete selection to render.
export function parseSelectedPlatforms(
  param: string | null | undefined,
): PlatformType[] {
  if (!param) return [...NETWORK_FILTER_PLATFORMS];

  const selected = param
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is PlatformType => PLATFORM_SET.has(value));

  return selected.length ? selected : [...NETWORK_FILTER_PLATFORMS];
}

export function isAllPlatformsSelected(selected: PlatformType[]): boolean {
  return selected.length >= NETWORK_FILTER_PLATFORMS.length;
}

// What to actually send to the API: `undefined` when everything is selected
// (keeps the default ranking path and clean URLs), otherwise the selection.
export function platformFilterParam(
  selected: PlatformType[],
): PlatformType[] | undefined {
  return isAllPlatformsSelected(selected) ? undefined : selected;
}

// Semantic content search only covers a subset of platforms; this intersection
// decides whether content search runs at all for the current selection.
export function getContentSearchPlatforms(
  selected: PlatformType[],
): PlatformType[] {
  return selected.filter(isPartnerContentSearchPlatform);
}
