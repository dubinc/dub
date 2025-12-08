import { getLeadEvents } from "@/lib/tinybird/get-lead-events";
import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const fraudEvents = await prisma.fraudEvent.findMany({
    where: {
      type: "paidTrafficDetected",
      customerId: {
        not: null,
      },
    },
    select: {
      id: true,
      customerId: true,
      metadata: true,
    },
  });

  console.log(`Found ${fraudEvents.length} paidTrafficDetected fraud events.`);

  const fraudEventsToUpdate = fraudEvents.filter((event) => {
    const metadata = event.metadata as { url: string | null };
    return !metadata.url;
  });

  console.log(
    `Found ${fraudEventsToUpdate.length} paidTrafficDetected fraud events without metadata.url`,
  );

  // Group events by customerId
  const eventsByCustomerId = fraudEventsToUpdate
    .filter((event) => event.customerId !== null)
    .reduce(
      (acc, event) => {
        acc[event.customerId!] = acc[event.customerId!] || [];
        acc[event.customerId!].push(event);
        return acc;
      },
      {} as Record<string, typeof fraudEventsToUpdate>,
    );

  const customerIds = Object.keys(eventsByCustomerId);
  const batches = chunk(customerIds, 100);

  // Find the URL for each customerId
  const customerIdToUrl = new Map<string, string>();

  for (const batch of batches) {
    const { data: events } = await getLeadEvents({
      customerIds: batch,
    });

    events.forEach((event) => {
      customerIdToUrl.set(event.customer_id, event.url);
    });
  }

  // Update the fraud events with the new metadata
  const eventsBatch = chunk(fraudEventsToUpdate, 100);

  for (const batch of eventsBatch) {
    await Promise.all(
      batch.map((event) => {
        const url = customerIdToUrl.get(event.customerId!);

        if (!url) {
          console.log(
            `Skipping fraud event ${event.id}: No URL found for customerId ${event.customerId}`,
          );

          return Promise.resolve(null);
        }

        return prisma.fraudEvent.update({
          where: {
            id: event.id,
          },
          data: {
            metadata: {
              ...(event.metadata as any),
              url,
            },
          },
        });
      }),
    );
  }
}

main();
