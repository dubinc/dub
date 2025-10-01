import { programLanderSchema } from "@/lib/zod/schemas/program-lander";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import "dotenv-flow/config";

async function main() {
  const programs = await prisma.program.findMany({
    include: {
      groups: true,
    },
  });

  console.log(`Found ${programs.length} programs.`);

  for (const program of programs) {
    const groupIds = program.groups.map(({ id }) => id);
    const programLanderData = program.landerData
      ? programLanderSchema.parse(program.landerData)
      : Prisma.JsonNull;

    console.log("programLanderData", programLanderData);

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

    console.log(`Updated ${updatedGroups.count} groups`);
  }
}

main();
