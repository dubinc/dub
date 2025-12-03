import { createFraudEventFingerprint } from "@/lib/api/fraud/utils";
import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  // Fetch all fraud events without a fingerprint
  const fraudEvents = await prisma.fraudEvent.findMany({
    where: {
      fingerprint: null,
    },
  });

  console.log(`Found ${fraudEvents.length} fraud events without fingerprints.`);

  const chunks = chunk(fraudEvents, 100);

  for (const batch of chunks) {
    await Promise.all(
      batch.map(async (event) => {
        try {
          await prisma.fraudEvent.update({
            where: { id: event.id },
            data: {
              fingerprint: createFraudEventFingerprint(event),
            },
          });
        } catch (error) {
          console.error(
            `Failed to backfill fingerprint for event ${event.id}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }),
    );
  }

  console.log("Fingerprint backfill completed.");
}

main();
