import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const now = new Date();
  const programs = await prisma.program.findMany({
    include: {
      groups: true,
    },
  });

  console.log(`Found ${programs.length} programs.`);

  for (const program of programs) {
    const groupIds = program.groups.map(({ id }) => id);

    // Use the default landerData

    await prisma.partnerGroup.updateMany({
      where: {
        id: {
          in: groupIds,
        },
      },
      data: {
        landerData: program.landerData || { blocks: [] },
        landerPublishedAt: now,
      },
    });
  }
}

main();
