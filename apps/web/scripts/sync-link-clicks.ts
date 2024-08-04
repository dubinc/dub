import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

const index = 24000;
const linkClicks: { domain: string; key: string; clicks: string }[] = [];

async function main() {
  Papa.parse(fs.createReadStream("sql.csv", "utf-8"), {
    header: true,
    step: (result: {
      data: { domain: string; key: string; clicks: string };
    }) => {
      linkClicks.push(result.data);
    },
    complete: async () => {
      const linksWithClicks = await prisma.link.findMany({
        where: {
          clicks: {
            gt: 0,
          },
        },
        select: {
          domain: true,
          key: true,
        },
      });
      console.table(linkClicks.slice(0, 50));

      const linkClicksToUpdate = linkClicks
        .filter((linkClick) => {
          const { domain, key } = linkClick;
          return linksWithClicks.find(
            (link) => link.domain === domain && link.key === key,
          );
        })
        .slice(index, index + 1000);

      await Promise.all(
        linkClicksToUpdate.map((linkClick) => {
          const { domain, key, clicks } = linkClick;
          console.log(`Updating ${domain}/${key} with ${clicks} clicks.`);
          return prisma.link.update({
            where: {
              domain_key: {
                domain,
                key,
              },
            },
            data: {
              clicks: parseInt(clicks),
            },
          });
        }),
      );

      console.log(
        `Done updating ${index} to ${index + linkClicksToUpdate.length} links.`,
      );
    },
  });
}

main();
