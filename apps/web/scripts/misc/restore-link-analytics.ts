import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { getAnalytics } from "../../lib/analytics/get-analytics";

let linksToRestore: { id: string }[] = [];

async function main() {
  Papa.parse(fs.createReadStream("deleted_links.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: {
      data: {
        link_id: string;
      };
    }) => {
      linksToRestore.push({ id: result.data.link_id });
    },
    complete: async () => {
      console.log(`Found ${linksToRestore.length} links to restore`);

      const chunks = chunk(linksToRestore, 200);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const linkIds = chunk.map((link) => link.id!);
        const stats = await getAnalytics({
          event: "composite",
          groupBy: "top_links",
          linkIds,
          interval: "1y",
        });
        if (stats.length === 0) {
          console.log(
            `No stats found for links in batch ${i + 1} of ${chunks.length}`,
          );
          continue;
        }
        console.log(
          `Stats found for links in batch ${i + 1} of ${chunks.length}`,
        );

        const linksToBackfill = stats.map((stat) => ({
          id: stat.id,
          clicks: stat.clicks,
          leads: stat.leads,
          conversions: Math.min(stat.leads, stat.sales),
          sales: stat.sales,
          saleAmount: stat.saleAmount,
        }));
        await Promise.all(
          linksToBackfill.map(async (link) => {
            const res = await prisma.link.update({
              where: { id: link.id },
              data: {
                clicks: link.clicks,
                leads: link.leads,
                conversions: link.conversions,
                sales: link.sales,
                saleAmount: link.saleAmount,
              },
            });
            console.log(
              `Updated ${link.id} to ${res.clicks} clicks, ${res.leads} leads, ${res.conversions} conversions, ${res.sales} sales, ${res.saleAmount} saleAmount`,
            );
          }),
        );

        console.log(
          `Backfilled stats for ${linksToBackfill.length} links in batch ${i + 1} of ${chunks.length}`,
        );
      }
    },
  });
}

main();
