import { prisma } from "@dub/prisma";
import { ACME_PROGRAM_ID } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const completedSubmissions = await prisma.bountySubmission.findMany({
    where: {
      status: { in: ["submitted", "approved"] },
      programId: ACME_PROGRAM_ID,
      completedAt: null,
    },
  });

  console.log(`Found ${completedSubmissions.length} submissions to backfill`);

  for (const submission of completedSubmissions) {
    const res = await prisma.bountySubmission.update({
      where: { id: submission.id },
      data: { completedAt: submission.updatedAt },
    });
    console.log(
      `Updated submission ${submission.id} to completedAt: ${res.completedAt}`,
    );
  }
}

main();
