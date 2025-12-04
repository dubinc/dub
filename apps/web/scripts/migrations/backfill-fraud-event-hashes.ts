import { createFraudEventHash } from "@/lib/api/fraud/utils";
import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  // Fetch all fraud events without a hash
  const fraudEvents = await prisma.fraudEvent.findMany({
    where: {
      hash: null,
    },
  });

  console.log(`Found ${fraudEvents.length} fraud events without hashes.`);

  const chunks = chunk(fraudEvents, 100);

  for (const batch of chunks) {
    await Promise.all(
      batch.map(async (event) => {
        try {
          await prisma.fraudEvent.update({
            where: { id: event.id },
            data: {
              hash: createFraudEventHash(event),
            },
          });
        } catch (error) {
          console.error(
            `Failed to backfill hash for event ${event.id}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }),
    );
  }

  console.log("Hash backfill completed.");
}

main();

