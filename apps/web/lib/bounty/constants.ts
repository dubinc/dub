export const BOUNTY_DESCRIPTION_MAX_LENGTH = 5000;

export const BOUNTY_MAX_SUBMISSION_FILES = 4;

export const BOUNTY_DEFAULT_SUBMISSION_URLS = 10;

export const BOUNTY_MAX_SUBMISSION_URLS = 100;

export const BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH = 1000;

export const BOUNTY_MAX_SUBMISSION_REJECTION_NOTE_LENGTH = 5000;

export const BOUNTY_SUBMISSION_REQUIREMENTS = ["image", "url"] as const;

export const REJECT_BOUNTY_SUBMISSION_REASONS = {
  invalidProof: "Invalid proof",
  duplicateSubmission: "Duplicate submission",
  outOfTimeWindow: "Out of time window",
  didNotMeetCriteria: "Did not meet criteria",
  other: "Other",
} as const;

export const BOUNTY_SOCIAL_PLATFORMS = [
  {
    value: "youtube",
    label: "YouTube",
    postType: "video",
    metrics: ["views", "likes"],
    placeholder: "https://www.youtube.com/watch?v=",
  },
  {
    value: "tiktok",
    label: "TikTok",
    postType: "video",
    metrics: ["views", "likes"],
    placeholder: "https://www.tiktok.com/@username/video/",
  },
  {
    value: "instagram",
    label: "Instagram",
    postType: "photo",
    metrics: ["likes", "views"],
    placeholder: "https://www.instagram.com/username/reel/",
  },
  {
    value: "twitter",
    label: "Twitter",
    postType: "tweet",
    metrics: ["likes", "views"],
    placeholder: "https://x.com/username/status/",
  },
] as const;

export const BOUNTY_SOCIAL_PLATFORM_VALUES = BOUNTY_SOCIAL_PLATFORMS.map(
  (p) => p.value,
);

export const BOUNTY_SOCIAL_PLATFORM_METRICS = BOUNTY_SOCIAL_PLATFORMS.map(
  (p) => p.metrics,
).flat();

export const BOUNTY_SOCIAL_PLATFORM_METRICS_MAP = Object.fromEntries(
  BOUNTY_SOCIAL_PLATFORMS.map((p) => [
    p.value,
    p.metrics.map((m) => ({
      value: m,
      label: m.charAt(0).toUpperCase() + m.slice(1),
    })),
  ]),
);
