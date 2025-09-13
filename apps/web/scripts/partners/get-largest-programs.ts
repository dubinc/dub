import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// Step 2 of 2: Backfill partner links with partnerGroupDefaultLinkId
async function main() {
  const largestPrograms = await prisma.programEnrollment.groupBy({
    by: ["programId"],
    _count: {
      programId: true,
    },
    orderBy: {
      _count: {
        programId: "desc",
      },
    },
    take: 100,
  });

  console.table(largestPrograms);
}

main();
