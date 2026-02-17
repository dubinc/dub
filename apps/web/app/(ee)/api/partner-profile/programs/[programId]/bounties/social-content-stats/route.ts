import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { getSocialContentStats } from "@/lib/api/scrape-creators/get-social-content-stats";
import { withPartnerProfile } from "@/lib/auth/partner";
import { getBountySocialPlatform } from "@/lib/bounty/utils";
import { PartnerBountyProps } from "@/lib/types";
import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const inputSchema = z.object({
  url: z.string(),
  bountyId: z.string(),
});

// POST /api/partner-profile/programs/[programId]/bounties/social-content-stats – get social content stats for a social content
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
      include: {},
    });

    const { url, bountyId } = inputSchema.parse(searchParams);

    const bounty = await prisma.bounty.findUniqueOrThrow({
      where: {
        id: bountyId,
      },
      select: {
        submissionRequirements: true,
      },
    });

    const { success } = await ratelimit(10, "24 h").limit(
      `retrieve-social-content-stats:${partner.id}:${bountyId}`,
    );

    if (!success) {
      throw new Error(
        "Unable to verify the social content at the moment. Please try again later.",
      );
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

    const { likes, views } = await getSocialContentStats({
      platform: platform.value,
      url,
    });

    return NextResponse.json({
      likes,
      views,
    });
  },
);
