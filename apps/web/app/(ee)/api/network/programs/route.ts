import { DubApiError } from "@/lib/api/errors";
import { withPartnerProfile } from "@/lib/auth/partner";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import {
  NetworkProgramSchema,
  getNetworkProgramsQuerySchema,
} from "@/lib/zod/schemas/program-network";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkProgramNetworkRequirements } from "./check-program-network-requirements";

// GET /api/network/programs - get all available programs in the network
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  if (!checkProgramNetworkRequirements({ partner }))
    throw new DubApiError({
      code: "forbidden",
      message: "Program network is not available for this partner.",
    });

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
      marketplaceEnabledAt: {
        not: null,
      },
      ...(featured && {
        marketplaceFeaturedAt: {
          not: null,
        },
      }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { slug: { contains: search } },
          { domain: { contains: search } },
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
      ...(status && {
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
      partners: {
        where: {
          partnerId: partner.id,
        },
      },
      categories: true,
    },
    orderBy:
      sortBy === "popularity"
        ? {
            partners: {
              _count: "desc",
            },
          }
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
        status: program.partners.length > 0 ? program.partners[0].status : null,
        categories: program.categories.map(({ category }) => category),
      })),
    ),
  );
});
