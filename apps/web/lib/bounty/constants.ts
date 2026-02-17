import type { SocialMetricsChannel } from "@/lib/types";

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

export const SOCIAL_METRICS_CHANNELS = [
  {
    value: "youtube",
    label: "YouTube",
    postType: "video",
  },
  {
    value: "tiktok",
    label: "TikTok",
    postType: "video",
  },
  {
    value: "instagram",
    label: "Instagram",
    postType: "photo",
  },
  {
    value: "twitter",
    label: "Twitter",
    postType: "tweet",
  },
] as const;

export const BOUNTY_SOCIAL_PLATFORMS = [
  "youtube",
  "instagram",
  "twitter",
  "tiktok",
] as const;

export const SOCIAL_METRICS_CHANNEL_METRICS: Record<
  SocialMetricsChannel,
  readonly { value: string; label: string }[]
> = {
  youtube: [
    { value: "views", label: "views" },
    { value: "likes", label: "likes" },
  ],
  instagram: [
    { value: "likes", label: "likes" },
    { value: "views", label: "views" },
  ],
  twitter: [
    { value: "likes", label: "likes" },
    { value: "views", label: "views" },
  ],
  tiktok: [
    { value: "likes", label: "likes" },
    { value: "views", label: "views" },
  ],
};

export const SOCIAL_METRICS_METRIC_VALUES = ["views", "likes"] as const;
