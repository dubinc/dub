import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";
import { syncTotalCommissions } from "../lib/api/partners/sync-total-commissions";

async function main() {
  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      totalCommissions: {
        gt: 0,
      },
    },
  });

  console.table(`Found ${programEnrollments.length} program enrollments`);
  const chunks = chunk(programEnrollments, 100);
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const res = await Promise.allSettled(
      chunk.map(async (programEnrollment) => {
        return await syncTotalCommissions({
          partnerId: programEnrollment.partnerId,
          programId: programEnrollment.programId,
        });
      }),
    );
    const successCount = res.filter((r) => r.status === "fulfilled").length;
    const errorCount = res.filter((r) => r.status === "rejected").length;
    console.log(
      `Processed chunk ${i + 1} of ${chunks.length} (${successCount} successes, ${errorCount} errors)`,
    );
    // sleep for 500ms
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

main();
