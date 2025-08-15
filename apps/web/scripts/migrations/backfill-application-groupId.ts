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

  const programApplications = await prisma.programApplication.groupBy({
    by: ["programId"],
    where: {
      groupId: null,
    },
    _count: {
      _all: true,
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

  const toUpdate = programApplications.map(({ programId, _count }) => ({
    programId,
    count: _count._all,
    groupId: programMap.get(programId),
  }));

  console.table(toUpdate);

  // Batch update the applications for the same programId
  for (const { programId, groupId } of toUpdate) {
    await prisma.programApplication.updateMany({
      where: {
        programId,
        groupId: null,
      },
      data: {
        groupId,
      },
    });
  }
}

main();
