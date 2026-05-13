import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

const BATCH_SIZE = 20;

async function main() {
  while (true) {
    const logs = await prisma.activityLog.findMany({
      where: {
        resourceType: "referral",
      },
      take: BATCH_SIZE,
    });

    if (logs.length === 0) {
      break;
    }

    for (const log of logs) {
      await prisma.activityLog.update({
        where: { id: log.id },
        data: {
          resourceType: "submittedLead",
          resourceId: log.resourceId.replace("ref_", "sbl_"),
          action: log.action.replace("referral.", "submittedLead."),
        },
      });
      console.log(`Migrated ${log.id}`);
    }
  }
}

main();
