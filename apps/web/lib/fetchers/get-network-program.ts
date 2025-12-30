import { prisma } from "@dub/prisma";
import { cache } from "react";
import { DEFAULT_PARTNER_GROUP } from "../zod/schemas/groups";
import { programLanderSchema } from "../zod/schemas/program-lander";
import { NetworkProgramExtendedSchema } from "../zod/schemas/program-network";

export const getNetworkProgram = cache(async ({ slug }: { slug: string }) => {
  const program = await prisma.program.findUnique({
    where: {
      slug,
      addedToMarketplaceAt: {
        not: null,
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
          discount: true,
        },
      },
      categories: true,
    },
  });

  if (!program) {
    return null;
  }

  return NetworkProgramExtendedSchema.parse({
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
    landerData: program.groups?.[0]?.landerData
      ? programLanderSchema.parse(program.groups[0].landerData)
      : null,
  });
});
