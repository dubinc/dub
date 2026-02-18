import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { getSocialContent } from "@/lib/api/scrape-creators/get-social-content";
import { withPartnerProfile } from "@/lib/auth/partner";
import { getBountyOrThrow } from "@/lib/bounty/api/get-bounty-or-throw";
import { getBountySocialPlatform } from "@/lib/bounty/utils";
import { PartnerBountyProps } from "@/lib/types";
import { ratelimit } from "@/lib/upstash";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const inputSchema = z.object({
  url: z.string(),
  bountyId: z.string(),
});

// TODO:
// - Add hostname allowlist per platform and validate the request url before calling scrape-creators
// - Cache getSocialContentStats results in Redis to reduce duplicate scrape-creators calls
// - Make sure the partner is verified their social account

// POST /api/partner-profile/programs/[programId]/bounties/social-content-stats – get social content stats for a social content
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
      include: {},
    });

    const { url, bountyId } = inputSchema.parse(searchParams);

    const bounty = await getBountyOrThrow({
      bountyId,
      programId: params.programId,
    });

    if (process.env.NODE_ENV !== "development") {
      const { success } = await ratelimit(10, "24 h").limit(
        `retrieve-social-content-stats:${partner.id}:${bountyId}`,
      );

      if (!success) {
        throw new DubApiError({
          code: "rate_limited",
          message:
            "You have reached the rate limit for retrieving social content stats.",
        });
      }
    }

    const platform = getBountySocialPlatform(
      bounty as Pick<PartnerBountyProps, "submissionRequirements">,
    );

    if (!platform) {
      throw new DubApiError({
        code: "bad_request",
        message: "Invalid bounty submission requirements.",
      });
    }

    const stats = await getSocialContent({
      platform: platform.value,
      url,
    });

    return NextResponse.json(stats);
  },
);
