import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { tb } from "../../lib/tinybird/client";
import z from "../../lib/zod";

const getFramerLeadEvents = tb.buildPipe({
  pipe: "get_framer_lead_events",
  parameters: z.object({
    linkId: z.string(),
  }),
  data: z.any(),
});

const framerCombinedData: {
  via: string;
  externalId: string;
  eventName: string;
  creationDate: string;
}[] = [];
const externalIdEventNameSet = new Set<string>();

async function processFramerData(linkToBackfill: {
  via: string;
  linkId: string;
}) {
  return new Promise<void>((resolve) => {
    Papa.parse(fs.createReadStream("framer_combined.csv", "utf-8"), {
      header: true,
      skipEmptyLines: true,
      step: (result: {
        data: {
          via: string;
          externalId: string;
          eventName: string;
          creationDate: string;
        };
      }) => {
        if (linkToBackfill.via === result.data.via) {
          // check if externalId:eventName pair already exists in framerCombinedData
          if (
            externalIdEventNameSet.has(
              `${result.data.externalId}:${result.data.eventName}`,
            )
          ) {
            return;
          }
          externalIdEventNameSet.add(
            `${result.data.externalId}:${result.data.eventName}`,
          );
          framerCombinedData.push({
            via: result.data.via,
            externalId: result.data.externalId,
            eventName: result.data.eventName,
            creationDate: result.data.creationDate,
          });
        }
      },
      complete: async () => {
        console.log(
          `Found ${framerCombinedData.length} framerCombinedData for ${linkToBackfill.via} (${linkToBackfill.linkId})`,
        );

        const { data: leadEvents } = await getFramerLeadEvents({
          linkId: linkToBackfill.linkId,
        });

        const customerIdsSet = new Set(
          leadEvents.map((event) => event.customer_id),
        );

        const customers = await prisma.customer.findMany({
          where: {
            id: {
              in: Array.from(customerIdsSet),
            },
          },
          select: {
            id: true,
            externalId: true,
          },
        });

        const processedLeadEvents = leadEvents.map((event) => {
          const customer = customers.find(
            (customer) => customer.id === event.customer_id,
          )!;
          return {
            linkId: event.link_id,
            externalId: customer.externalId!,
            eventName: event.event_name,
            creationDate: event.timestamp,
          };
        });

        console.log(
          `Found ${processedLeadEvents.length} processedLeadEvents for ${linkToBackfill.via} (${linkToBackfill.linkId})`,
        );

        // find events in framerCombinedData that don't exist in processedLeadEvents
        const eventsToBackfill = framerCombinedData.filter(
          (event) =>
            !processedLeadEvents.find(
              (ple) =>
                ple.externalId.toLowerCase() ===
                  event.externalId.toLowerCase() &&
                ple.eventName.toLowerCase() === event.eventName.toLowerCase(),
            ),
        );

        console.log(
          `Found ${eventsToBackfill.length} events to backfill for ${linkToBackfill.via} (${linkToBackfill.linkId})`,
        );
        // append to framer_remaining_events_final.csv
        fs.appendFileSync(
          "framer_remaining_events_final.csv",
          Papa.unparse(eventsToBackfill),
        );
        resolve();
      },
    });
  });
}

async function main() {
  const linksWithSales = JSON.parse(
    fs.readFileSync("framer_links_with_sales_to_backfill.json", "utf-8"),
  );

  for (const linkToBackfill of linksWithSales) {
    await processFramerData(linkToBackfill);
  }
}

main();
