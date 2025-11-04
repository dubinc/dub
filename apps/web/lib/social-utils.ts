export type SocialPlatform =
  | "youtube"
  | "twitter"
  | "linkedin"
  | "instagram"
  | "tiktok";

interface SocialPlatformConfig {
  patterns: RegExp[];
  allowedChars: RegExp;
  maxLength?: number;
}

const PLATFORM_CONFIGS: Record<SocialPlatform, SocialPlatformConfig> = {
  youtube: {
    patterns: [
      /^(?:.*\.)?(?:youtube\.com|youtu\.be)\/(?:channel\/|c\/|user\/|@)?([^\/\?]+)/i,
      /^@([^\/\?]+)/i,
    ],
    allowedChars: /[^\w.-]/g,
    maxLength: 30,
  },
  twitter: {
    patterns: [
      /^(?:.*\.)?(?:twitter\.com|x\.com)\/([^\/\?]+)/i,
      /^@([^\/\?]+)/i,
    ],
    allowedChars: /[^\w]/g,
    maxLength: 15,
  },
  linkedin: {
    patterns: [/^(?:.*\.)?linkedin\.com\/(?:in\/)?([^\/\?]+)/i],
    allowedChars: /[^\w-]/g,
    maxLength: 30,
  },
  instagram: {
    patterns: [/^(?:.*\.)?instagram\.com\/([^\/\?]+)/i, /^@([^\/\?]+)/i],
    allowedChars: /[^\w.]/g,
    maxLength: 30,
  },
  tiktok: {
    patterns: [/^(?:.*\.)?tiktok\.com\/(?:@)?([^\/\?]+)/i, /^@([^\/\?]+)/i],
    allowedChars: /[^\w.]/g,
    maxLength: 24,
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

  const { patterns, allowedChars, maxLength } = PLATFORM_CONFIGS[platform];

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
