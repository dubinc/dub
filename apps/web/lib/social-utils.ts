import { SocialPlatform } from "@dub/prisma/client";

interface SocialPlatformConfig {
  patterns: RegExp[];
  allowedChars: RegExp;
  maxLength?: number;
  name: string;
}

export const SOCIAL_PLATFORM_CONFIGS: Record<
  Exclude<SocialPlatform, "website">,
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
    name: "Twitter",
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

  if (!website.startsWith("http")) website = `https://${website}`;

  try {
    const url = new URL(website);
    url.search = "";

    return url.toString();
  } catch (e) {
    return null;
  }
};

export const sanitizeSocialHandle = (
  input: string | null | undefined,
  platform: SocialPlatform,
) => {
  if (!input || typeof input !== "string") {
    return null;
  }

  let handle = input.trim();
  if (!handle) {
    return null;
  }

  handle = handle.replace(/^https?:\/\//i, "").replace(/^www\./i, "");

  const { patterns, allowedChars, maxLength } =
    SOCIAL_PLATFORM_CONFIGS[platform];

  for (const pattern of patterns) {
    const match = handle.match(pattern);

    if (match) {
      handle = match[1];
      break;
    }
  }

  handle = handle
    .replace(/\/.*$/, "")
    .replace(/\?.*$/, "")
    .replace(allowedChars, "");

  if (maxLength) {
    handle = handle.substring(0, maxLength);
  }

  return handle || null;
};
