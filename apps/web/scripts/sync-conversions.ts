import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

const data: { [key: number]: string[] } = {};

async function main() {
  Papa.parse(fs.createReadStream("link_id_unique_customers.csv", "utf-8"), {
    header: true,
    step: (result: { data: { link_id: string; unique_customers: number } }) => {
      data[result.data.unique_customers] = (
        data[result.data.unique_customers] || []
      ).concat(result.data.link_id);
    },
    complete: async () => {
      const dataArray = Object.entries(data).map(([conversions, linkIds]) => ({
        conversions: parseInt(conversions),
        linkIds,
      }));
      console.table(dataArray);

      for (const { conversions, linkIds } of dataArray) {
        const chunks = chunk(linkIds, 1000);
        for (const chunk of chunks) {
          const res = await prisma.link.updateMany({
            where: {
              id: { in: chunk },
            },
            data: {
              conversions,
            },
          });
          console.log(
            `Updated ${res.count} links with ${conversions} conversions.`,
          );
        }
      }
    },
  });
}

main();
