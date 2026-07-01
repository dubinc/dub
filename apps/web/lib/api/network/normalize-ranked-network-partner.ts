import { NetworkPartnerSchema } from "@/lib/zod/schemas/partner-network";
import { PreferredEarningStructure, SalesChannel } from "@prisma/client";
import * as z from "zod/v4";

type RankedNetworkPartnerRow = Record<string, unknown> & {
  starredAt?: Date | string | null;
  ignoredAt?: Date | string | null;
  invitedAt?: Date | string | null;
  identityVerificationStatus?: string | null;
  identityVerifiedAt?: Date | string | null;
  categories?: string | null;
  preferredEarningStructures?: string | null;
  salesChannels?: string | null;
};

export function parseRankedNetworkPartners(
  partners: RankedNetworkPartnerRow[],
) {
  return z.array(NetworkPartnerSchema).parse(
    partners.map((partner) => ({
      ...partner,
      starredAt: toNullableDate(partner.starredAt),
      ignoredAt: toNullableDate(partner.ignoredAt),
      invitedAt: toNullableDate(partner.invitedAt),
      identityVerificationStatus: partner.identityVerificationStatus ?? null,
      identityVerifiedAt: toNullableDate(partner.identityVerifiedAt),
      categories: splitCommaSeparated(partner.categories),
      preferredEarningStructures: splitCommaSeparated(
        partner.preferredEarningStructures,
      ) as PreferredEarningStructure[],
      salesChannels: splitCommaSeparated(
        partner.salesChannels,
      ) as SalesChannel[],
    })),
  );
}

function toNullableDate(value: Date | string | null | undefined) {
  return value ? new Date(value) : null;
}

function splitCommaSeparated(value: string | null | undefined) {
  return value ? value.split(",").map((item) => item.trim()) : [];
}
