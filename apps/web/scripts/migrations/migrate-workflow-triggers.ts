import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const workflows = await prisma.workflow.updateMany({
    where: {
      trigger: {
        in: ["leadRecorded", "saleRecorded", "commissionEarned"],
      },
    },
    data: {
      trigger: "partnerMetricsUpdated",
    },
  });

  console.log(`Updated ${workflows.count} workflows.`);
}

main();
