import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// Run this only after "backfill-partner-groups.ts"
async function main() {
  const programs = await prisma.program.findMany({
    select: {
      id: true,
      defaultGroupId: true,
    },
    take: 100,
  });

  console.table(programs);

  const programApplications = await prisma.programApplication.findMany({
    where: {
      groupId: null,
    },
  });

  if (programApplications.length === 0) {
    console.log("No program applications to update.");
    return;
  }

  console.log(
    `Found ${programApplications.length} program applications to update`,
  );

  // Create a map of programId -> defaultGroupId
  const programMap = new Map(
    programs.map(({ id, defaultGroupId }) => [id, defaultGroupId]),
  );

  await Promise.allSettled(
    programApplications.map(({ id, programId }) => {
      if (!programMap.has(programId)) {
        console.error(`defaultGroupId not found for ${programId}.`);
        return;
      }

      return prisma.programApplication.update({
        where: {
          id,
        },
        data: {
          groupId: programMap.get(programId),
        },
      });
    }),
  );
}

main();
