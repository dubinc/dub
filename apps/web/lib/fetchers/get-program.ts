import { prisma } from "@dub/prisma";
import { cache } from "react";
import { sortRewardsByEventOrder } from "../partners/sort-rewards-by-event-order";

export const getProgram = cache(
  async ({
    slug,
    include,
  }: {
    slug: string;
    include?: ("defaultRewards" | "defaultDiscount")[];
  }) => {
    const program = await prisma.program.findUnique({
      where: {
        slug,
      },
      include: {
        ...(include?.includes("defaultRewards") && {
          rewards: {
            where: {
              default: true, // program-wide rewards only
            },
          },
        }),
        ...(include?.includes("defaultDiscount") && {
          defaultDiscount: true,
        }),
      },
    });

    if (!program) {
      return null;
    }

    if (include?.includes("defaultRewards")) {
      program.rewards = sortRewardsByEventOrder(program.rewards);
    }

    return program;
  },
);
