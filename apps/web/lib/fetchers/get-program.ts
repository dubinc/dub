import { prisma } from "@dub/prisma";
import { cache } from "react";
import { reorderTopProgramRewards } from "../partners/reorder-top-program-rewards";

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

    if (program && include?.includes("defaultRewards")) {
      program.rewards = reorderTopProgramRewards(program.rewards);
    }

    return program;
  },
);
