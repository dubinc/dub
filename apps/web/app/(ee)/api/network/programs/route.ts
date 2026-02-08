import { withPartnerProfile } from "@/lib/auth/partner";
import { throwIfPartnerCannotViewMarketplace } from "@/lib/network/throw-if-partner-cannot-view-marketplace";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import {
  NetworkProgramSchema,
  getNetworkProgramsQuerySchema,
} from "@/lib/zod/schemas/program-network";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/network/programs - get all available programs in the network
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  await throwIfPartnerCannotViewMarketplace({ partner });

  const {
    search,
    featured,
    category,
    rewardType,
    status,
    sortBy,
    sortOrder,
    page,
    pageSize,
  } = getNetworkProgramsQuerySchema.parse(searchParams);

  const programs = await prisma.program.findMany({
    where: {
      // Added to marketplace
      addedToMarketplaceAt: {
        not: null,
      },
      ...(featured && {
        featuredOnMarketplaceAt: {
          not: null,
        },
      }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { slug: { contains: search } },
          { domain: { contains: search } },
          { url: { contains: search } },
          { description: { contains: search } },
        ],
      }),
      ...(category && {
        categories: {
          some: {
            category,
          },
        },
      }),
      ...(rewardType && {
        groups: {
          some: {
            slug: DEFAULT_PARTNER_GROUP.slug,
            ...(rewardType.includes("sale") && {
              saleRewardId: { not: null },
            }),
            ...(rewardType.includes("lead") && {
              leadRewardId: { not: null },
            }),
            ...(rewardType.includes("click") && {
              clickRewardId: { not: null },
            }),
            ...(rewardType.includes("discount") && {
              discountId: { not: null },
            }),
          },
        },
      }),
      ...(status !== undefined && {
        partners:
          status === null
            ? { none: { partnerId: partner.id } }
            : {
                some: {
                  partnerId: partner.id,
                  status,
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
      categories: true,
    },
    orderBy:
      sortBy === "popularity"
        ? [
            {
              marketplaceRanking: "asc",
            },
            {
              applications: {
                _count: "desc",
              },
            },
          ]
        : { [sortBy]: sortOrder },
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
        categories: program.categories.map(({ category }) => category),
      })),
    ),
  );
});
