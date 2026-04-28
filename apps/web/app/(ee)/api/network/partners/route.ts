import { DubApiError } from "@/lib/api/errors";
import { calculatePartnerRanking } from "@/lib/api/network/calculate-partner-ranking";
import { partnerNetworkListingWhere } from "@/lib/api/network/partner-network-listing-where";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { PROGRAM_SIMILARITY_SCORE_THRESHOLD } from "@/lib/constants/program";
import {
  NetworkPartnerSchema,
  getNetworkPartnersQuerySchema,
} from "@/lib/zod/schemas/partner-network";
import { prisma } from "@dub/prisma";
import { PreferredEarningStructure, SalesChannel } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

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
              gt: PROGRAM_SIMILARITY_SCORE_THRESHOLD,
            },
          },
          orderBy: {
            similarityScore: "desc",
          },
          take: 10,
        },
      },
    });

    if (!program.partnerNetworkEnabledAt) {
      throw new DubApiError({
        code: "forbidden",
        message: "Partner network is not enabled for this program.",
      });
    }

    const {
      partnerIds,
      status,
      page,
      pageSize,
      country,
      starred,
      platform,
      subscribers,
    } = getNetworkPartnersQuerySchema.parse(searchParams);

    if (status !== "discover") {
      const partnerWhere = partnerNetworkListingWhere({
        partnerIds,
        country,
        platform,
        subscribers,
      });

      const partners = await prisma.discoveredPartner.findMany({
        where: {
          programId,
          partner: partnerWhere,
          ...(status === "ignored" && { ignoredAt: { not: null } }),
          ...(status === "invited" && {
            invitedAt: { not: null },
            ignoredAt: null,
            programEnrollment: { status: "invited" },
          }),
          ...(status === "recruited" && {
            invitedAt: { not: null },
            programEnrollment: { status: "approved" },
          }),
        },
        orderBy: {
          ...(status === "ignored" && { ignoredAt: "desc" }),
          ...(status === "invited" && { invitedAt: "desc" }),
          ...(status === "recruited" && {
            programEnrollment: { createdAt: "desc" },
          }),
        },
        include: {
          partner: {
            include: {
              platforms: true,
            },
          },
          programEnrollment: true,
        },
        take: pageSize,
        skip: ((page ?? 1) - 1) * pageSize,
      });

      return NextResponse.json(
        partners.map(({ partner, ...rest }) =>
          NetworkPartnerSchema.parse({
            ...rest,
            ...partner,
            categories: [],
            recruitedAt:
              rest.programEnrollment?.status === "approved"
                ? new Date(rest.programEnrollment.createdAt)
                : null,
          }),
        ),
      );
    }

    const similarPrograms = program.similarPrograms.map((sp) => ({
      programId: sp.similarProgramId,
      similarityScore: sp.similarityScore,
    }));

    console.time("calculatePartnerRanking");
    const partners = await calculatePartnerRanking({
      programId,
      partnerIds,
      status,
      country,
      page,
      pageSize,
      starred: starred ?? undefined,
      platform: platform ?? undefined,
      subscribers: subscribers ?? undefined,
      similarPrograms,
    });
    console.timeEnd("calculatePartnerRanking");

    return NextResponse.json(
      z.array(NetworkPartnerSchema).parse(
        partners.map((partner) => ({
          ...partner,
          starredAt: partner.starredAt ? new Date(partner.starredAt) : null,
          ignoredAt: partner.ignoredAt ? new Date(partner.ignoredAt) : null,
          invitedAt: partner.invitedAt ? new Date(partner.invitedAt) : null,
          identityVerificationStatus:
            partner.identityVerificationStatus ?? null,
          identityVerifiedAt: partner.identityVerifiedAt
            ? new Date(partner.identityVerifiedAt)
            : null,
          categories: partner.categories
            ? partner.categories.split(",").map((c: string) => c.trim())
            : [],
          preferredEarningStructures: partner.preferredEarningStructures
            ? partner.preferredEarningStructures
                .split(",")
                .map((e: string) => e.trim() as PreferredEarningStructure)
            : [],
          salesChannels: partner.salesChannels
            ? partner.salesChannels
                .split(",")
                .map((s: string) => s.trim() as SalesChannel)
            : [],
        })),
      ),
    );
  },
  {
    requiredPlan: ["enterprise", "advanced"],
  },
);
