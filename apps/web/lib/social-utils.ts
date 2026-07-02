import { getUrlFromStringIfValid } from "@dub/utils";
import { PartnerPlatform, PlatformType } from "@prisma/client";

type PrimarySelectablePlatform = Pick<
  PartnerPlatform,
  "type" | "identifier" | "verifiedAt" | "subscribers"
>;

// Maximum number of handles a partner can add per platform type
export const MAX_PLATFORMS_PER_TYPE = 2;

// Canonical display order for platform types
export const PLATFORM_ORDER: PlatformType[] = [
  "website",
  "youtube",
  "twitter",
  "instagram",
  "tiktok",
  "linkedin",
];

interface SocialPlatformConfig {
  patterns: RegExp[];
  allowedChars: RegExp;
  maxLength?: number;
  name: string;
}

export const SOCIAL_PLATFORM_CONFIGS: Record<
  Exclude<PlatformType, "website">,
  SocialPlatformConfig
> = {
  youtube: {
    patterns: [
      /^(?:.*\.)?(?:youtube\.com|youtu\.be)\/(?:channel\/|c\/|user\/|@)?([^\/\?]+)/i,
      /^@([^\/\?]+)/i,
    ],
    allowedChars: /[^\w.-]/g,
    maxLength: 30,
    name: "YouTube",
  },
  twitter: {
    patterns: [
      /^(?:.*\.)?(?:twitter\.com|x\.com)\/([^\/\?]+)/i,
      /^@([^\/\?]+)/i,
    ],
    allowedChars: /[^\w]/g,
    maxLength: 15,
    name: "X/Twitter",
  },
  linkedin: {
    patterns: [/^(?:.*\.)?linkedin\.com\/(?:in\/)?([^\/\?]+)/i],
    allowedChars: /[^\w-]/g,
    maxLength: 30,
    name: "LinkedIn",
  },
  instagram: {
    patterns: [/^(?:.*\.)?instagram\.com\/([^\/\?]+)/i, /^@([^\/\?]+)/i],
    allowedChars: /[^\w.]/g,
    maxLength: 30,
    name: "Instagram",
  },
  tiktok: {
    patterns: [/^(?:.*\.)?tiktok\.com\/(?:@)?([^\/\?]+)/i, /^@([^\/\?]+)/i],
    allowedChars: /[^\w.]/g,
    maxLength: 24,
    name: "TikTok",
  },
};

export const sanitizeWebsite = (input: string | null | undefined) => {
  if (!input || typeof input !== "string") return null;

  let website = input.trim();
  if (!website) return null;
  if (!website.includes(".") || website.includes(" ")) return null;

  return getUrlFromStringIfValid(website);
};

export const sanitizeSocialHandle = (
  input: string | null | undefined,
  platform: PlatformType,
) => {
  if (!input || typeof input !== "string") {
    return null;
  }

  let handle = input.trim();
  if (!handle) {
    return null;
  }

  handle = handle
    .replace(/^https?:\/\//i, "")
    .replace(/^https?$/i, "") // standalone "http" or "https"
    .replace(/^www\./i, "") // www. prefix
    .replace(/\?.*$/, "") // query params (e.g. ?s=21&t=...)
    .replace(/#.*$/, ""); // hash/fragment (e.g. #section)

  const { patterns, allowedChars, maxLength } =
    SOCIAL_PLATFORM_CONFIGS[platform];

  for (const pattern of patterns) {
    const match = handle.match(pattern);

    if (match) {
      handle = match[1];
      break;
    }
  }

  handle = handle.replace(/\/.*$/, "").replace(allowedChars, "");

  if (maxLength) {
    handle = handle.substring(0, maxLength);
  }

  return handle || null;
};

// Prefer a verified handle, then the highest subscribers
function isBetterPrimary({
  candidate,
  current,
}: {
  candidate: PrimarySelectablePlatform;
  current: PrimarySelectablePlatform;
}) {
  const candidateVerified = candidate.verifiedAt ? 1 : 0;
  const currentVerified = current.verifiedAt ? 1 : 0;

  if (candidateVerified !== currentVerified) {
    return candidateVerified > currentVerified;
  }

  const candidateSubs = Number(candidate.subscribers ?? 0);
  const currentSubs = Number(current.subscribers ?? 0);

  if (candidateSubs !== currentSubs) {
    return candidateSubs > currentSubs;
  }

  return true;
}

// Selects the single "primary" handle of a given type from a list that may
// contain multiple handles per type.
export function selectPrimaryPlatform<T extends PrimarySelectablePlatform>(
  platforms: T[],
  type: PlatformType,
): T | undefined {
  let primary: T | undefined;

  for (const platform of platforms) {
    if (platform.type !== type) {
      continue;
    }

    if (
      !primary ||
      isBetterPrimary({ candidate: platform, current: primary })
    ) {
      primary = platform;
    }
  }

  return primary;
}

// Converts an array of platform objects into a key-value object for easy lookup
// by platform name. When a partner has multiple handles of the same type, the
// "primary" handle (verified > highest subscribers > most recent) is used.
export function buildSocialPlatformLookup<T extends PrimarySelectablePlatform>(
  platforms: T[],
): Record<PlatformType, T | null> {
  const result = {
    website: null,
    youtube: null,
    twitter: null,
    linkedin: null,
    instagram: null,
    tiktok: null,
  } as Record<PlatformType, T | null>;

  for (const platform of platforms) {
    const current = result[platform.type];

    if (
      !current ||
      isBetterPrimary({
        candidate: platform,
        current,
      })
    ) {
      result[platform.type] = platform;
    }
  }

  return result;
}

// Polyfills social media fields from platforms array for backward compatibility
export function polyfillSocialMediaFields<T extends PrimarySelectablePlatform>(
  platforms: T[],
) {
  const platformsMap = buildSocialPlatformLookup(platforms);

  return {
    website: platformsMap["website"]?.identifier ?? null,
    youtube: platformsMap["youtube"]?.identifier ?? null,
    twitter: platformsMap["twitter"]?.identifier ?? null,
    linkedin: platformsMap["linkedin"]?.identifier ?? null,
    instagram: platformsMap["instagram"]?.identifier ?? null,
    tiktok: platformsMap["tiktok"]?.identifier ?? null,
  };
}
