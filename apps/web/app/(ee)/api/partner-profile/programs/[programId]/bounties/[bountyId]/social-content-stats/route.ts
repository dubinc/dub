import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { getSocialContent } from "@/lib/api/scrape-creators/get-social-content";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  bountyEligibilityIncludes,
  canPartnerSubmitBounty,
} from "@/lib/bounty/api/bounty-availability";
import { getBountyOrThrow } from "@/lib/bounty/api/get-bounty-or-throw";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const searchParamsSchema = z.object({
  url: z.httpUrl("Social media URL is required."),
});

// GET /api/partner-profile/programs/[programId]/bounties/[bountyId]/social-content-stats
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { programId, bountyId } = params;

    const { url } = searchParamsSchema.parse(searchParams);

    await assertRateLimit({
      policy: RATELIMIT_POLICIES.socialContentStats,
      identifier: partner.id,
    });

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId,
      include: {
        program: {
          select: {
            id: true,
            defaultGroupId: true,
          },
        },
        programPartnerTags: {
          select: {
            partnerTagId: true,
          },
        },
      },
    });

    const bounty = await getBountyOrThrow({
      bountyId,
      programId: programEnrollment.programId,
      include: {
        ...bountyEligibilityIncludes,
        submissions: {
          where: {
            partnerId: partner.id,
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
      program: programEnrollment.program,
      bounty,
      programEnrollment,
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
