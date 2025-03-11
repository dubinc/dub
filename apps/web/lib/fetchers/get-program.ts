import { prisma } from "@dub/prisma";
import { cache } from "react";

export const getProgram = cache(
  async ({
    slug,
    include,
  }: {
    slug: string;
    include?: ("rewards" | "defaultDiscount")[];
  }) => {
    const program = await prisma.program.findUnique({
      where: {
        slug,
      },
      include: {
        ...(include?.includes("rewards") && {
          rewards: {
            where: {
              partners: {
                none: {}, // program-wide rewards only
              },
            },
          },
        }),
        ...(include?.includes("defaultDiscount") && {
          defaultDiscount: true,
        }),
      },
    });

    if (program && include?.includes("rewards")) {
      program.rewards = ["click", "lead", "sale"]
        .map((event) =>
          program?.rewards.find((reward) => reward.event === event),
        )
        .filter((reward) => reward !== undefined && reward !== null);
    }

    return program;
  },
);
