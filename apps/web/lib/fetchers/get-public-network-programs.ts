import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import {
  getPublicNetworkProgramsQuerySchema,
  NetworkProgramSchema,
  PROGRAM_NETWORK_MAX_PAGE_SIZE,
} from "@/lib/zod/schemas/program-network";
import { prisma } from "@dub/prisma";
import { cache } from "react";
import * as z from "zod/v4";

export const getPublicNetworkPrograms = cache(
  async (
    params: Partial<z.infer<typeof getPublicNetworkProgramsQuerySchema>> = {},
  ) => {
    const {
      category,
      rewardType,
      featured,
      search,
      sortBy = "popularity",
      sortOrder = "desc",
      page = 1,
      pageSize = PROGRAM_NETWORK_MAX_PAGE_SIZE,
    } = params;

    const programs = await prisma.program.findMany({
      where: {
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
        groups: {
          some: {
            slug: DEFAULT_PARTNER_GROUP.slug,
            applicationFormPublishedAt: {
              not: null,
            },
            ...(rewardType === "sale" && {
              saleRewardId: { not: null },
            }),
            ...(rewardType === "lead" && {
              leadRewardId: { not: null },
            }),
            ...(rewardType === "click" && {
              clickRewardId: { not: null },
            }),
            ...(rewardType === "discount" && {
              discountId: { not: null },
            }),
          },
        },
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
            referralReward: true,
            discount: true,
          },
        },
        categories: true,
      },
      orderBy:
        sortBy === "popularity"
          ? { marketplaceRanking: "asc" }
          : {
              [sortBy === "recency" ? "addedToMarketplaceAt" : sortBy]:
                sortOrder,
            },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return z.array(NetworkProgramSchema).parse(
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
    );
  },
);
