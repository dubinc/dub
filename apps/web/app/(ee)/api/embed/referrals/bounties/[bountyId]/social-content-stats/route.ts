import { DubApiError } from "@/lib/api/errors";
import { getSocialContent } from "@/lib/api/scrape-creators/get-social-content";
import {
  bountyEligibilityIncludes,
  throwIfPartnerCannotSubmitBounty,
} from "@/lib/bounty/api/bounty-eligibility";
import { getBountyOrThrow } from "@/lib/bounty/api/get-bounty-or-throw";
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
  async ({ programEnrollment, searchParams, params }) => {
    const { bountyId } = params;
    const { url } = searchParamsSchema.parse(searchParams);

    const { success } = await ratelimit(10, "1 h").limit(
      `partner-profile:social-content-stats:${programEnrollment.partnerId}`,
    );

    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message: "You've been rate limited. Please try again later.",
      });
    }

    const bounty = await getBountyOrThrow({
      bountyId,
      programId: programEnrollment.programId,
      include: {
        ...bountyEligibilityIncludes,
      },
    });

    throwIfPartnerCannotSubmitBounty({
      programEnrollment,
      bounty,
    });

    const bountyInfo = resolveBountyDetails(bounty);

    if (!bountyInfo?.socialMetrics) {
      throw new DubApiError({
        code: "bad_request",
        message: "This bounty does not have social content requirements.",
      });
    }

    const content = await getSocialContent({
      platform: bountyInfo.socialMetrics.platform,
      url,
    });

    return NextResponse.json(content);
  },
);
