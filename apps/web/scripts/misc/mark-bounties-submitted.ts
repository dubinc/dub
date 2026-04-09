import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const bountySubmissions = await prisma.bountySubmission.findMany({
    where: {
      status: "draft",
      socialMetricCount: {
        not: null,
      },
    },
    select: {
      id: true,
      status: true,
      socialMetricCount: true,
    },
  });

  console.log(
    `Found ${bountySubmissions.length} bounty submissions to mark as submitted.`,
  );

  console.table(bountySubmissions);

  const { count } = await prisma.bountySubmission.updateMany({
    where: {
      id: {
        in: bountySubmissions.map(({ id }) => id),
      },
      status: "draft",
    },
    data: {
      status: "submitted",
    },
  });

  console.log(`Marked ${count} bounty submissions as submitted.`);
}

main();
