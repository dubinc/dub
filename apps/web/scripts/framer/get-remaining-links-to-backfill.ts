import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

const framerCombinedData: {
  via: string;
  externalId: string;
  eventName: string;
  creationDate: string;
}[] = [];
const externalIdEventNameSet = new Set<string>();

const salesData: Record<string, number> = {};

async function main() {
  // First read the sales data
  Papa.parse(fs.createReadStream("framer_links_with_sales.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: {
      data: {
        link_id: string;
        sales: string;
      };
    }) => {
      salesData[result.data.link_id] = parseInt(result.data.sales);
    },
    complete: () => {
      console.log(
        `Found ${Object.keys(salesData).length} links with sales data`,
      );
      // After sales data is loaded, process the combined data
      processCombinedData();
    },
  });
}

function processCombinedData() {
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
    },
    complete: async () => {
      console.log(`Found ${framerCombinedData.length} links in Framer`);

      // convert to via + count
      const viaCount = framerCombinedData.reduce(
        (acc, curr) => {
          acc[curr.via] = (acc[curr.via] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // order by count
      const viaCountArray = Object.entries(viaCount)
        .map(([via, count]) => ({
          via,
          count,
        }))
        .sort((a, b) => b.count - a.count);

      const prismaLinks = await prisma.link.findMany({
        where: {
          domain: "framer.link",
          key: {
            in: viaCountArray.map(({ via }) => via),
          },
        },
        select: {
          id: true,
          key: true,
        },
      });

      const linkIdsWithCount = viaCountArray
        .map(({ via }) => {
          const link = prismaLinks.find((link) => link.key === via);
          const count = viaCount[via];
          const sales = link ? salesData[link.id] || 0 : 0;
          if (count === sales) {
            return null;
          }
          return {
            linkId: link?.id,
            via,
            count,
            recordedSales: sales,
          };
        })
        .filter(Boolean);

      // Sort by sales instead of count
      linkIdsWithCount.sort(
        (a, b) => (b?.recordedSales || 0) - (a?.recordedSales || 0),
      );

      console.log(
        `Found ${linkIdsWithCount.length} links with sales data that need to be backfilled`,
      );

      console.table(linkIdsWithCount.slice(0, 100));

      fs.writeFileSync(
        "framer_links_with_sales_to_backfill.json",
        JSON.stringify(linkIdsWithCount, null, 2),
      );
    },
  });
}

main();
