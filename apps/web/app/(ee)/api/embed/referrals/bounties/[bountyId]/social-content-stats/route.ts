import { DubApiError } from "@/lib/api/errors";
import { getSocialContent } from "@/lib/api/scrape-creators/get-social-content";
import { canPartnerSubmitBounty } from "@/lib/bounty/api/bounty-availability";
import { getBountyOrThrow } from "@/lib/bounty/api/get-bounty-or-throw";
import { getPlatformFromSocialUrl } from "@/lib/bounty/social-content";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { ratelimit } from "@/lib/upstash";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const searchParamsSchema = z.object({
  url: z.httpUrl("Social media URL is required."),
});

// GET /api/embed/referrals/bounties/[bountyId]/social-content-stats
export const GET = withReferralsEmbedToken(
  async ({ program, programEnrollment, searchParams, params }) => {
    const { bountyId } = params;
    const { url } = searchParamsSchema.parse(searchParams);

    const bounty = await getBountyOrThrow({
      bountyId,
      programId: programEnrollment.programId,
      include: {
        groups: {
          select: {
            groupId: true,
          },
        },
      },
    });

    const bountyInfo = resolveBountyDetails(bounty);

    if (!bountyInfo?.socialMetrics) {
      throw new DubApiError({
        code: "bad_request",
        message: "This bounty does not have social content requirements.",
      });
    }

    const canSubmitBounty = canPartnerSubmitBounty({
      program,
      bounty,
      programEnrollment,
    });

    if (!canSubmitBounty) {
      throw new DubApiError({
        code: "not_found",
        message: "Bounty not found.",
      });
    }

    const rateLimit = 10 * Math.max(1, bountyInfo.socialPlatforms.length);
    const { success } = await ratelimit(rateLimit, "1 h").limit(
      `partner-profile:social-content-stats:${programEnrollment.partnerId}`,
    );

    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message: "You've been rate limited. Please try again later.",
      });
    }

    const platform = getPlatformFromSocialUrl(url);

    if (
      !platform ||
      !bountyInfo.socialPlatforms.some((p) => p.value === platform)
    ) {
      throw new DubApiError({
        code: "bad_request",
        message: `This link must be from one of: ${bountyInfo.socialPlatforms.map((p) => p.label).join(", ")}.`,
      });
    }

    const content = await getSocialContent({
      platform,
      url,
    });

    return NextResponse.json(content);
  },
);
