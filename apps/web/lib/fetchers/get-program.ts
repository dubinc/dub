import { prisma } from "@dub/prisma";
import { cache } from "react";
import { sortRewardsByEventOrder } from "../partners/sort-rewards-by-event-order";

export const getProgram = cache(
  async ({
    slug,
    include,
  }: {
    slug: string;
    include?: ("allRewards" | "allDiscounts")[];
  }) => {
    const program = await prisma.program.findUnique({
      where: {
        slug,
      },
      include: {
        ...(include?.includes("allRewards") && {
          rewards: include.includes("allRewards")
            ? true
            : {
                where: {
                  default: true, // program-wide rewards only
                },
              },
        }),
        ...(include?.includes("allDiscounts") && {
          discounts: include.includes("allDiscounts")
            ? true
            : {
                where: {
                  default: true, // program-wide discounts only
                },
              },
        }),
      },
    });

    if (!program) {
      return null;
    }

    if (include?.includes("allRewards")) {
      program.rewards = sortRewardsByEventOrder(program.rewards);
    }

    return program;
  },
);
