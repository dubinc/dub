// @ts-nocheck

import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

type RawDataProps = {
  event_name: string;
  timestamp: string;
  customer_id: string;
  link_id: string;
};

type ProcessedDataProps = {
  via: string;
  externalId: string;
  eventName: string;
  creationDate: Date;
};

let rawData: RawDataProps[] = [];
let customerIdsSet = new Set<string>();
let linkIdsSet = new Set<string>();

const BATCH = 7;
const FRAMER_WORKSPACE_ID = "xxx";

async function main() {
  Papa.parse(
    fs.createReadStream(`get_framer_lead_events_${BATCH}.csv`, "utf-8"),
    {
      header: true,
      skipEmptyLines: true,
      step: (result: { data: RawDataProps }) => {
        const { customer_id, link_id } = result.data;
        rawData.push(result.data);
        linkIdsSet.add(link_id);
        customerIdsSet.add(customer_id);
      },
      complete: async () => {
        const linkIdsArray = Array.from(linkIdsSet);
        const customerIdsArray = Array.from(customerIdsSet);

        console.log(
          `Found ${linkIdsArray.length} links and ${customerIdsArray.length} customers`,
        );

        const links = await prisma.link.findMany({
          where: {
            id: {
              in: linkIdsArray,
            },
            projectId: FRAMER_WORKSPACE_ID,
          },
          select: {
            id: true,
            key: true,
          },
        });

        let customers: { id: string; externalId: string | null }[] = [];
        const customerIdChunks = chunk(customerIdsArray, 1000);
        for (const customerIdChunk of customerIdChunks) {
          const data = await prisma.customer.findMany({
            where: {
              id: {
                in: customerIdChunk,
              },
              projectId: FRAMER_WORKSPACE_ID,
            },
            select: {
              id: true,
              externalId: true,
            },
          });
          customers.push(...data);
        }

        console.log(`Found ${customers.length} customers`);

        const processedData = rawData
          .map((data) => {
            const link = links.find((link) => link.id === data.link_id);
            const customer = customers.find(
              (customer) => customer.id === data.customer_id,
            );
            if (!link || !customer || !customer.externalId) {
              return null;
            }
            return {
              via: link.key,
              externalId: customer.externalId,
              eventName: data.event_name,
              creationDate: new Date(data.timestamp),
            };
          })
          .filter((data) => data !== null) satisfies ProcessedDataProps[];

        fs.writeFileSync(
          `processed_framer_lead_events_${BATCH}.csv`,
          Papa.unparse(processedData),
        );
      },
    },
  );
}

main();
