import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { getSocialContent } from "@/lib/api/scrape-creators/get-social-content";
import { withPartnerProfile } from "@/lib/auth/partner";
import { getBountyOrThrow } from "@/lib/bounty/api/get-bounty-or-throw";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import { ratelimit } from "@/lib/upstash";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const searchParamsSchema = z.object({
  url: z.url("Social media URL is required."),
});

// GET /api/partner-profile/programs/[programId]/bounties/[bountyId]/social-content-stats
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { programId, bountyId } = params;

    const { url } = searchParamsSchema.parse(searchParams);

    const { success } = await ratelimit(10, "1 h").limit(
      `partner-profile:social-content-stats:${partner.id}`,
    );

    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message: "You've been rate limited. Please try again later.",
      });
    }

    const programEnrollment = getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId,
      include: {},
    });

    const bounty = await getBountyOrThrow({
      bountyId,
      programId: (await programEnrollment).programId,
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
