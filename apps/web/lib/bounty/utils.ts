import { Prisma } from "@prisma/client";
import { bountySocialContentRequirementsSchema } from "../zod/schemas/bounties";
import {
  BOUNTY_SOCIAL_PLATFORMS,
  getPlatformFromSocialUrl,
} from "./social-content";

interface BountyInfoInput {
  submissionRequirements?: Prisma.JsonValue | undefined | null;
  rewardAmount?: number | undefined | null;
}

export function resolveBountyDetails(
  bounty: BountyInfoInput | undefined | null,
) {
  if (!bounty) {
    return null;
  }

  // Social metrics requirements
  const submissionRequirements = bounty.submissionRequirements as {
    socialMetrics?: unknown | Prisma.JsonValue | undefined | null;
  };

  const parsedSocialMetrics = bountySocialContentRequirementsSchema
    .optional()
    .safeParse(submissionRequirements?.socialMetrics);

  const socialMetrics = parsedSocialMetrics.success
    ? parsedSocialMetrics.data
    : null;

  // Identify the social platform(s)
  const socialPlatforms = (socialMetrics?.platforms ?? [])
    .map((value) => BOUNTY_SOCIAL_PLATFORMS.find((p) => p.value === value))
    .filter((p): p is (typeof BOUNTY_SOCIAL_PLATFORMS)[number] => p != null);

  // Kept for convenience: the first (or only) targeted platform
  const socialPlatform = socialPlatforms[0];
  const isMultiPlatformSocialMetrics = socialPlatforms.length > 1;
  const isAndSocialMetrics =
    socialMetrics?.logic === "AND" && isMultiPlatformSocialMetrics;

  // AND bounties need one URL field/slot per required platform; OR bounties
  // (single or multi-platform) only ever need a single social URL slot.
  const socialUrlSlotCount = isAndSocialMetrics
    ? socialPlatforms.length
    : socialPlatforms.length > 0
      ? 1
      : 0;

  return {
    ...bounty,
    socialPlatforms,
    socialPlatform,
    socialMetrics,
    hasSocialMetrics: socialMetrics != null,
    isMultiPlatformSocialMetrics,
    isAndSocialMetrics,
    socialUrlSlotCount,
  };
}

// Eg: "Instagram", "Instagram or TikTok", "Instagram and TikTok"
export function formatSocialPlatformsList(
  platforms: Pick<(typeof BOUNTY_SOCIAL_PLATFORMS)[number], "label">[],
  logic: "OR" | "AND" = "OR",
) {
  const labels = platforms.map((p) => p.label);

  if (labels.length === 0) {
    return "";
  }

  if (labels.length === 1) {
    return labels[0];
  }

  const joinWord = logic === "AND" ? "and" : "or";

  if (labels.length === 2) {
    return `${labels[0]} ${joinWord} ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, ${joinWord} ${labels[labels.length - 1]}`;
}

/**
 * Rebuilds a submission's `urls` array into the slot layout the claim/submission forms
 * expect: the first `socialUrlSlotCount` entries are reserved for the social content
 * field(s) (matched back to their platform by URL for AND bounties), followed by any
 * other free-form submitted URLs.
 */
export function buildInitialSubmissionUrls(
  bountyInfo: ReturnType<typeof resolveBountyDetails>,
  submissionUrls?: string[] | null,
): string[] {
  const urls = submissionUrls ?? [];
  const numSocialSlots = bountyInfo?.socialUrlSlotCount ?? 0;

  if (numSocialSlots === 0) {
    return urls.length > 0 ? [...urls] : [""];
  }

  if (!bountyInfo?.isAndSocialMetrics) {
    return urls.length > 0 ? [urls[0] ?? "", ...urls.slice(1)] : [""];
  }

  const remaining = [...urls];
  const socialSlots = bountyInfo.socialPlatforms.map((platform) => {
    const idx = remaining.findIndex(
      (u) => getPlatformFromSocialUrl(u) === platform.value,
    );
    if (idx === -1) {
      return "";
    }
    return remaining.splice(idx, 1)[0] ?? "";
  });

  return [...socialSlots, ...remaining];
}
