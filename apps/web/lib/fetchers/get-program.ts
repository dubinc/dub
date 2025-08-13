import { prisma } from "@dub/prisma";
import { Program } from "@prisma/client";
import { cache } from "react";
import { DiscountProps, GroupProps, RewardProps } from "../types";

type Result = Program & {
  groups: GroupProps[];
};

export const getProgram = cache(
  async ({ slug, groupSlug }: { slug: string; groupSlug?: string }) => {
    const programData = await prisma.program.findUnique({
      where: {
        slug,
      },
      ...(groupSlug && {
        include: {
          groups: {
            where: {
              slug: groupSlug,
            },
            include: {
              clickReward: true,
              leadReward: true,
              saleReward: true,
              discount: true,
            },
          },
        },
      }),
    });

    if (!programData) {
      return null;
    }

    // If no group slug is provided, return the program data with no rewards or discount
    if (!groupSlug) {
      return {
        ...programData,
        rewards: [],
        discount: null,
      };
    }

    // Extract the group data and find its rewards and discount
    const { groups, ...program } = programData as unknown as Result;
    const group = groups[0];

    const rewards = [
      group.clickReward,
      group.leadReward,
      group.saleReward,
    ].filter(Boolean);

    const discount = group.discount;

    return {
      ...program,
      rewards: rewards as RewardProps[],
      discount: discount as DiscountProps | null,
    };
  },
);
