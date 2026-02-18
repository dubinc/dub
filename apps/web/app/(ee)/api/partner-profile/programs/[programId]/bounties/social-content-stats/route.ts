import { getBountyOrThrow } from "@/lib/api/bounties/get-bounty-or-throw";
import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { getSocialContentStats } from "@/lib/api/scrape-creators/get-social-content-stats";
import { withPartnerProfile } from "@/lib/auth/partner";
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

    const platform = getBountySocialPlatform(
      bounty as Pick<PartnerBountyProps, "submissionRequirements">,
    );

    if (!platform) {
      throw new DubApiError({
        code: "bad_request",
        message: "Invalid bounty submission requirements.",
      });
    }

    const { likes, views, handle, platformId, publishedAt } =
      await getSocialContentStats({
        platform: platform.value,
        url,
      });

    return NextResponse.json({
      likes,
      views,
      handle,
      platformId,
      publishedAt,
    });
  },
);
