import { DubApiError } from "@/lib/api/errors";
import { getSocialContent } from "@/lib/api/scrape-creators/get-social-content";
import {
  bountyEligibilityIncludes,
  canPartnerSubmitBounty,
} from "@/lib/bounty/api/bounty-availability";
import { getBountyOrThrow } from "@/lib/bounty/api/get-bounty-or-throw";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
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

    await assertRateLimit({
      policy: RATELIMIT_POLICIES.socialContentStats,
      identifier: programEnrollment.partnerId,
    });

    const bounty = await getBountyOrThrow({
      bountyId,
      programId: programEnrollment.programId,
      include: {
        ...bountyEligibilityIncludes,
      },
    });

    const bountyInfo = resolveBountyDetails(bounty);

    if (!bountyInfo?.socialMetrics) {
      throw new DubApiError({
        code: "bad_request",
        message: "This bounty does not have social content requirements.",
      });
    }

    const partnerTags = await prisma.programPartnerTag.findMany({
      where: {
        programId: programEnrollment.programId,
        partnerId: programEnrollment.partnerId,
      },
      select: {
        partnerTagId: true,
      },
    });

    const canSubmitBounty = canPartnerSubmitBounty({
      program,
      bounty,
      programEnrollment: {
        ...programEnrollment,
        programPartnerTags: partnerTags,
      },
    });

    if (!canSubmitBounty) {
      throw new DubApiError({
        code: "not_found",
        message: "Bounty not found.",
      });
    }

    const content = await getSocialContent({
      platform: bountyInfo.socialMetrics.platform,
      url,
    });

    return NextResponse.json(content);
  },
);
