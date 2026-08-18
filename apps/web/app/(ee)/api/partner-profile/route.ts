import { withPartnerProfile } from "@/lib/auth/partner";
import { getPartnerFeatureFlags } from "@/lib/edge-config";
import { prisma } from "@/lib/prisma";
import { flattenVeriffMetadata } from "@/lib/veriff/veriff-metadata";
import { partnerPlatformSchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";

// GET /api/partner-profile - get a partner profile
export const GET = withPartnerProfile(async ({ partner, partnerUser }) => {
  const [featureFlags, partnerWithRelations] = await Promise.all([
    getPartnerFeatureFlags(partner.id),
    prisma.partner.findUniqueOrThrow({
      where: {
        id: partner.id,
      },
      include: {
        industryInterests: true,
        preferredEarningStructures: true,
        salesChannels: true,
        platforms: true,
      },
    }),
  ]);

  const {
    industryInterests,
    preferredEarningStructures,
    salesChannels,
    platforms,
    ...partnerProps
  } = partnerWithRelations;

  return NextResponse.json({
    ...partnerUser,
    ...flattenVeriffMetadata(partnerProps),
    industryInterests: industryInterests.map(
      ({ industryInterest }) => industryInterest,
    ),
    preferredEarningStructures: preferredEarningStructures.map(
      ({ preferredEarningStructure }) => preferredEarningStructure,
    ),
    salesChannels: salesChannels.map(({ salesChannel }) => salesChannel),
    platforms: partnerPlatformSchema.array().parse(platforms),
    featureFlags,
  });
});
