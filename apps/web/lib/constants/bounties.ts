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
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "x_twitter", label: "X/Twitter" },
] as const;

export type SocialMetricsChannel =
  (typeof SOCIAL_METRICS_CHANNELS)[number]["value"];

export const SOCIAL_METRICS_CHANNEL_METRICS: Record<
  SocialMetricsChannel,
  readonly { value: string; label: string }[]
> = {
  youtube: [
    { value: "views", label: "Views" },
    { value: "likes", label: "Likes" },
    { value: "comments", label: "Comments" },
  ],
  tiktok: [
    { value: "likes", label: "Likes" },
    { value: "comments", label: "Comments" },
    { value: "views", label: "Views" },
  ],
  instagram: [
    { value: "likes", label: "Likes" },
    { value: "views", label: "Views" },
  ],
  x_twitter: [
    { value: "favorites", label: "Favorites" },
    { value: "replies", label: "Replies" },
    { value: "retweets", label: "Retweets" },
  ],
};

export const SOCIAL_METRICS_METRIC_VALUES = [
  "views",
  "likes",
  "comments",
  "favorites",
  "replies",
  "retweets",
] as const;

export type SocialMetricsMetric =
  (typeof SOCIAL_METRICS_METRIC_VALUES)[number];
