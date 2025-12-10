import { withPartnerProfile } from "@/lib/auth/partner";
import { throwIfPartnerCannotViewMarketplace } from "@/lib/network/throw-if-partner-cannot-view-marketplace";
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
      // Has a published default application form
      groups: {
        some: {
          slug: DEFAULT_PARTNER_GROUP.slug,
          applicationFormPublishedAt: {
            not: null,
          },
        },
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
          // { description: { contains: search } },
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
        ? {
            applications: {
              _count: "desc",
            },
          }
        : { [sortBy]: sortOrder },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  // If sorting by popularity, put promoted programs first
  if (sortBy === "popularity") {
    const PROMOTED_PROGRAM_IDS = [
      "prog_1K0QHV7MP3PR05CJSCF5VN93X",
      "prog_1JPKFV1EFCJACKR4QZBZGRMZ9",
      "prog_1K7J9JV5P2NBPH4A4X4YGHV68",
      "prog_MqN7G1vSbuSELpYJwioHyDE8",
      "prog_qGGSH0jXFZLeogOnq1sLkriY",
      "prog_1K0A6SX71Q3ZRC1HYFMXQGWJ8",
    ];

    const promoted = programs.filter((p) =>
      PROMOTED_PROGRAM_IDS.includes(p.id),
    );
    const others = programs.filter((p) => !PROMOTED_PROGRAM_IDS.includes(p.id));
    // Sort promoted by their order in PROMOTED_PROGRAM_IDS
    promoted.sort(
      (a, b) =>
        PROMOTED_PROGRAM_IDS.indexOf(a.id) - PROMOTED_PROGRAM_IDS.indexOf(b.id),
    );
    programs.splice(0, programs.length, ...promoted, ...others);
  }

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
