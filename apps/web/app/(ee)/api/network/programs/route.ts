import { withPartnerProfile } from "@/lib/auth/partner";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import {
  NetworkProgramSchema,
  getNetworkProgramsQuerySchema,
} from "@/lib/zod/schemas/program-network";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/network/programs - get all available programs in the network
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const { category, page, pageSize } =
    getNetworkProgramsQuerySchema.parse(searchParams);

  const programs = await prisma.program.findMany({
    where: {
      marketplaceEnabledAt: {
        not: null,
      },
      ...(category && {
        categories: {
          some: {
            category,
          },
        },
      }),
    },
    include: {
      groups: {
        where: {
          slug: DEFAULT_PARTNER_GROUP.slug,
        },
        include: {
          clickReward: true,
          leadReward: true,
          saleReward: true,
          discount: true,
        },
      },
      partners: {
        where: {
          partnerId: partner.id,
        },
      },
      categories: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return NextResponse.json(
    z.array(NetworkProgramSchema).parse(
      programs.map((program) => ({
        ...program,
        rewards:
          program.groups.length > 0
            ? [
                program.groups[0].clickReward,
                program.groups[0].leadReward,
                program.groups[0].saleReward,
              ].filter(Boolean)
            : [],
        discount: program.groups.length > 0 ? program.groups[0].discount : null,
        status: program.partners.length > 0 ? program.partners[0].status : null,
        categories: program.categories.map(({ category }) => category),
      })),
    ),
  );
});
