import { withAdmin } from "@/lib/auth";
import { adminNetworkPartnerSchema } from "@/lib/zod/schemas/admin";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/admin/partners/network
export const GET = withAdmin(async () => {
  const partners = await prisma.partner.findMany({
    where: {
      networkStatus: "submitted",
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      platforms: true,
      industryInterests: true,
      preferredEarningStructures: true,
      salesChannels: true,
      programs: {
        orderBy: {
          totalCommissions: "desc",
        },
        include: {
          program: true,
        },
      },
    },
    take: 100,
  });

  return NextResponse.json({
    partners: adminNetworkPartnerSchema.array().parse(
      partners.map((partner) => ({
        ...partner,
        industryInterests: partner.industryInterests.map(
          (interest) => interest.industryInterest,
        ),
        preferredEarningStructures: partner.preferredEarningStructures.map(
          (structure) => structure.preferredEarningStructure,
        ),
        salesChannels: partner.salesChannels.map(
          (channel) => channel.salesChannel,
        ),
        programs: partner.programs.map((program) => ({
          ...program,
          ...program.program,
        })),
      })),
    ),
  });
});
