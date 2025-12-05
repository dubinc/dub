import { createFraudEventHash } from "@/lib/api/fraud/utils";
import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";

/**
 * Backfill hashes for existing fraud events.
 * Generates and updates hash values for fraud events that are missing them.
 * Hashes are used for deduplication to prevent creating duplicate fraud events.
 */
async function main() {
  const fraudEvents = await prisma.fraudEvent.findMany({
    where: {
      hash: null,
    },
  });

  console.log(`Found ${fraudEvents.length} fraud events without hashes.`);

  const chunks = chunk(fraudEvents, 100);

  for (const batch of chunks) {
    await Promise.all(
      batch.map((event) =>
        prisma.fraudEvent.update({
          where: {
            id: event.id,
          },
          data: {
            hash: createFraudEventHash(event),
          },
        }),
      ),
    );
  }

  console.log("Hash backfill completed.");
}

main();
