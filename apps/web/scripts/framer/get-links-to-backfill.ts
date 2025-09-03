import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

const tbLinkData: { link_id: string; sales: number }[] = [];

async function main() {
  Papa.parse(fs.createReadStream("framer_links_with_sales.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: { data: { link_id: string; sales: string } }) => {
      tbLinkData.push({
        link_id: result.data.link_id,
        sales: parseInt(result.data.sales),
      });
    },
    complete: async () => {
      console.log(`Found ${tbLinkData.length} links with sales in Tinybird`);
      const prismaLinkData = await prisma.link.findMany({
        where: {
          programId: "prog_xxx",
          sales: {
            gt: 0,
          },
        },
        select: {
          id: true,
          key: true,
          sales: true,
        },
        orderBy: {
          sales: "desc",
        },
      });
      console.log(`Found ${prismaLinkData.length} links with sales in Prisma`);

      let linksWithSameSalesCount = 0;
      const linksWithDifferentSalesCount = prismaLinkData
        .map((prismaLink) => {
          const tbLink = tbLinkData.find(
            (tbLink) => tbLink.link_id === prismaLink.id,
          );
          // if the sales count is the roughly the same (within a 10% margin),
          // if means it was backfilled correctly – don't return the link
          if (
            tbLink &&
            (tbLink.sales === prismaLink.sales ||
              tbLink.sales / prismaLink.sales < 1.1 ||
              tbLink.sales / prismaLink.sales > 0.9)
          ) {
            linksWithSameSalesCount++;
            return null;
          }
          return {
            linkId: prismaLink.id,
            via: prismaLink.key,
            prismaSales: prismaLink.sales,
            tbSales: tbLink?.sales || 0,
          };
        })
        .filter(Boolean);
      console.log(
        `Found ${linksWithSameSalesCount} links with the same sales count`,
      );
      console.log(
        `Found ${linksWithDifferentSalesCount.length} links with different sales count:`,
      );
      console.table(linksWithDifferentSalesCount.slice(0, 100));

      // write to file
      fs.writeFileSync(
        "framer_links_to_backfill.csv",
        Papa.unparse(linksWithDifferentSalesCount),
      );
    },
  });
}

main();
