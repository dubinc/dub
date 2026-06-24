import {
  partnerNetworkListingWhere,
  partnerReachWhere,
} from "@/lib/api/network/partner-network-listing-where";
import type { ReachTier } from "@/lib/api/network/reach-tiers";
import { prisma } from "@/lib/prisma";
import { NetworkPartnerSchema } from "@/lib/zod/schemas/partner-network";
import type { PlatformType } from "@prisma/client";
import type * as z from "zod/v4";

type NetworkPartnerCard = z.infer<typeof NetworkPartnerSchema>;

// Hydrate partner cards for content search
export async function getNetworkPartnersById({
  programId,
  partnerIds,
  platforms,
  reach,
  country,
}: {
  programId: string;
  partnerIds: string[];
  platforms?: PlatformType[];
  reach?: ReachTier[];
  country?: string;
}): Promise<Map<string, NetworkPartnerCard>> {
  if (partnerIds.length === 0) return new Map();

  const partners = await prisma.partner.findMany({
    where: {
      AND: [
        partnerNetworkListingWhere({ partnerIds, country }),
        // do not require verified platforms for content search; move this out of partnerNetworkListingWhere
        ...(platforms?.length
          ? [{ platforms: { some: { type: { in: platforms } } } }]
          : []),
        partnerReachWhere({ reach, platform: platforms }),
      ],
    },
    select: {
      id: true,
      name: true,
      companyName: true,
      country: true,
      profileType: true,
      image: true,
      description: true,
      createdAt: true,
      networkStatus: true,
      monthlyTraffic: true,
      identityVerificationStatus: true,
      identityVerifiedAt: true,
      platforms: {
        select: {
          type: true,
          identifier: true,
          verifiedAt: true,
          platformId: true,
          subscribers: true,
          posts: true,
          views: true,
        },
      },
      programs: {
        where: { status: "approved" },
        select: {
          program: { select: { categories: { select: { category: true } } } },
        },
      },
      discoveredByPrograms: {
        where: { programId },
        select: { starredAt: true, invitedAt: true, ignoredAt: true },
        take: 1,
      },
    },
  });

  const cards = partners.map((partner): NetworkPartnerCard => {
    const discovered = partner.discoveredByPrograms[0];
    const categories = Array.from(
      new Set(
        partner.programs.flatMap(({ program }) =>
          program.categories.map(({ category }) => category),
        ),
      ),
    ).sort();

    return {
      id: partner.id,
      name: partner.name,
      companyName: partner.companyName,
      country: partner.country,
      profileType: partner.profileType,
      image: partner.image,
      description: partner.description,
      createdAt: partner.createdAt,
      networkStatus: partner.networkStatus,
      monthlyTraffic: partner.monthlyTraffic,
      identityVerificationStatus: partner.identityVerificationStatus,
      identityVerifiedAt: partner.identityVerifiedAt,
      preferredEarningStructures: [], // schema-required; UI doesn't read them
      salesChannels: [],
      starredAt: discovered?.starredAt ?? null,
      invitedAt: discovered?.invitedAt ?? null,
      ignoredAt: discovered?.ignoredAt ?? null,
      recruitedAt: null, // discover candidates aren't enrolled in this program
      categories,
      platforms: partner.platforms,
    };
  });

  return new Map(cards.map((card) => [card.id, card]));
}
