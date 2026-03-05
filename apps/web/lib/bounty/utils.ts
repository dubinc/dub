import { Prisma } from "@dub/prisma/client";
import { bountySocialContentRequirementsSchema } from "../zod/schemas/bounties";
import { BOUNTY_SOCIAL_PLATFORMS } from "./constants";

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

  // Identify the social platform
  const socialPlatform = BOUNTY_SOCIAL_PLATFORMS.find(
    ({ value }) => value === socialMetrics?.platform,
  );

  return {
    ...bounty,
    socialPlatform,
    socialMetrics,
    hasSocialMetrics: socialMetrics != null,
  };
}
