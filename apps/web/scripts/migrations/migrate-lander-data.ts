// @ts-nocheck -- contains old schema types

import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { programLanderSchema } from "@/lib/zod/schemas/program-lander";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";

async function main() {
  const programs = await prisma.program.findMany({
    where: {
      landerData: {
        not: Prisma.DbNull,
      },
    },
    include: {
      groups: true,
    },
  });

  console.log(`Found ${programs.length} programs with lander data.`);
  console.table(programs, ["name", "slug", "landerPublishedAt"]);

  for (const program of programs) {
    const groupIds = program.groups.map(({ id }) => id);
    const programLanderData = program.landerData
      ? programLanderSchema.parse(program.landerData)
      : Prisma.DbNull;

    // Use the default landerData
    const updatedGroups = await prisma.partnerGroup.updateMany({
      where: {
        id: {
          in: groupIds,
        },
      },
      data: {
        landerData: programLanderData,
      },
    });

    console.log(
      `Updated ${updatedGroups.count} groups with program lander data`,
    );

    if (program.landerPublishedAt) {
      const updatedDefaultGroup = await prisma.partnerGroup.update({
        where: {
          programId_slug: {
            programId: program.id,
            slug: DEFAULT_PARTNER_GROUP.slug,
          },
        },
        data: {
          landerPublishedAt: program.landerPublishedAt,
        },
      });

      console.log(
        `Updated default group landerPublishedAt to ${updatedDefaultGroup.landerPublishedAt}`,
      );
    }
  }
}

main();
