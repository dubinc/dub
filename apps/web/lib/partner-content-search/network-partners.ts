import { calculatePartnerRanking } from "@/lib/api/network/calculate-partner-ranking";
import { parseRankedNetworkPartners } from "@/lib/api/network/normalize-ranked-network-partner";
import type { ReachTier } from "@/lib/api/network/reach-tiers";
import type { PlatformType } from "@prisma/client";

// Hydrates ranked partner candidates into network-partner cards (keyed by id) with the
// listing's reach/country/starred/platform filters. Only place search touches
// calculatePartnerRanking; the ranking it returns is discarded (topicFit reorders).
export async function getNetworkPartnersById({
  programId,
  partnerIds,
  platforms,
  reach,
  country,
  starred,
}: {
  programId: string;
  partnerIds: string[];
  platforms?: PlatformType[];
  reach?: ReachTier[];
  country?: string;
  starred?: boolean;
}) {
  if (partnerIds.length === 0) return new Map();

  const rankedPartners = await calculatePartnerRanking({
    programId,
    partnerIds,
    status: "discover",
    page: 1,
    pageSize: partnerIds.length,
    country,
    starred: starred ?? undefined,
    platform: platforms,
    reach,
  });
  const partners = parseRankedNetworkPartners(rankedPartners);

  return new Map(partners.map((partner) => [partner.id, partner]));
}
