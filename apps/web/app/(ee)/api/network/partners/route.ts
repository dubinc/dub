import { getConversionScore } from "@/lib/actions/partners/get-conversion-score";
import { DubApiError } from "@/lib/api/errors";
import { calculatePartnerRanking } from "@/lib/api/network/partner-ranking";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  NetworkPartnerSchema,
  getNetworkPartnersQuerySchema,
} from "@/lib/zod/schemas/partner-network";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/network/partners - get all available partners in the network
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const program = await prisma.program.findUniqueOrThrow({
      where: {
        id: programId,
      },
      include: {
        similarPrograms: {
          where: {
            similarityScore: {
              gt: 0.3,
            },
          },
          take: 5,
        },
      },
    });

    if (!program.partnerNetworkEnabledAt) {
      throw new DubApiError({
        code: "forbidden",
        message: "Partner network is not enabled for this program.",
      });
    }

    const { partnerIds, status, page, pageSize, country, starred } =
      getNetworkPartnersQuerySchema.parse(searchParams);

    const similarPrograms = program.similarPrograms.map((sp) => ({
      programId: sp.similarProgramId,
      similarityScore: sp.similarityScore,
    }));

    const partners = await calculatePartnerRanking({
      programId,
      partnerIds,
      status,
      country,
      page,
      pageSize,
      starred: starred ?? undefined,
      similarPrograms,
    });

    return NextResponse.json(
      z.array(NetworkPartnerSchema).parse(
        partners.map((partner) => ({
          ...partner,
          conversionScore: getConversionScore(partner.conversionRate || 0),
          starredAt: partner.starredAt ? new Date(partner.starredAt) : null,
          ignoredAt: partner.ignoredAt ? new Date(partner.ignoredAt) : null,
          invitedAt: partner.invitedAt ? new Date(partner.invitedAt) : null,
          categories: partner.categories
            ? partner.categories.split(",").map((c: string) => c.trim())
            : [],
        })),
      ),
    );
  },
  {
    requiredPlan: ["enterprise"],
  },
);
