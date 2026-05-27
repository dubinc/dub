import { formatNetworkPrograms } from "@/lib/network/format-network-programs";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { getPublicNetworkProgramsQuerySchema } from "@/lib/zod/schemas/program-network";
import { prisma } from "@dub/prisma";
import { cache } from "react";
import * as z from "zod/v4";

export const getPublicNetworkPrograms = cache(
  async (params: z.input<typeof getPublicNetworkProgramsQuerySchema> = {}) => {
    const {
      category,
      rewardType,
      featured,
      search,
      sortBy = "popularity",
      sortOrder = "desc",
      page = 1,
      pageSize,
    } = getPublicNetworkProgramsQuerySchema.parse(params);

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
        invoices: true,
      },
      orderBy:
        sortBy === "popularity"
          ? {}
          : {
              [sortBy === "recency" ? "addedToMarketplaceAt" : sortBy]:
                sortOrder,
            },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return formatNetworkPrograms({
      programs,
      featured,
      sortBy,
    });
  },
);

export const getPublicNetworkProgramsCount = cache(
  async (
    params: Pick<
      z.input<typeof getPublicNetworkProgramsQuerySchema>,
      "category" | "rewardType" | "search"
    > = {},
  ) => {
    const { category, rewardType, search } = getPublicNetworkProgramsQuerySchema
      .pick({
        category: true,
        rewardType: true,
        search: true,
      })
      .parse(params);

    return prisma.program.count({
      where: {
        addedToMarketplaceAt: {
          not: null,
        },
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
    });
  },
);
