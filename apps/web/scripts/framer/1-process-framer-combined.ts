import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { tb } from "../../lib/tinybird/client";
import z from "../../lib/zod";

/*
  Script to convert framer-combined.csv that Framer gave us
  into framer_remaining_events_final_final.csv
  (script 1 of 3 for Framer backfill)
*/

const getFramerLeadEvents = tb.buildPipe({
  pipe: "get_framer_lead_events",
  parameters: z.object({
    linkIds: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : v.split(","))),
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
          linkIds: linkToBackfill.linkId,
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
        // append to framer_remaining_events_final_final.csv
        fs.appendFileSync(
          "framer_remaining_events_final_final.csv",
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

  if (linksWithSales.length === 0) {
    console.log("No more links to process!");
    return;
  }

  // Get the first link to process
  const linkToProcess = linksWithSales[0];

  if (linkToProcess.linkId) {
    console.log(
      `Processing link: ${linkToProcess.via} (${linkToProcess.linkId})`,
    );

    await processFramerData(linkToProcess);
  } else {
    console.log("No linkId found for linkToProcess");
  }

  // Remove the processed link from the array
  linksWithSales.shift();

  // Write the updated array back to the file
  fs.writeFileSync(
    "framer_links_with_sales_to_backfill.json",
    JSON.stringify(linksWithSales, null, 2),
  );

  console.log(`Remaining links to process: ${linksWithSales.length}`);
}

main();
