// @ts-nocheck

// TODO:
// Fix the script

import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

const index = 1000;
const domainClicks: { domain: string; clicks: string }[] = [];

async function main() {
  Papa.parse(fs.createReadStream("sql.csv", "utf-8"), {
    header: true,
    step: (result: { data: { domain: string; clicks: string } }) => {
      domainClicks.push(result.data);
    },
    complete: async () => {
      const domainWithClicks = await prisma.domain.findMany({
        where: {
          clicks: {
            gt: 0,
          },
        },
        select: {
          slug: true,
        },
      });
      console.table(domainClicks.slice(0, 50));
      const domainClickToUpdate = domainClicks
        .filter((domainClick) => {
          const { domain } = domainClick;
          return domainWithClicks.find(({ slug }) => slug === domain);
        })
        .slice(index, index + 1000);

      await Promise.all(
        domainClickToUpdate.map(async (domainClick) => {
          const { domain, clicks } = domainClick;
          console.log(`Updating ${domain} with ${clicks} clicks.`);
          return prisma.domain.update({
            where: {
              slug: domain,
            },
            data: {
              clicks: parseInt(clicks),
            },
          });
        }),
      );
      console.log(
        `Done updating ${index} to ${
          index + domainClickToUpdate.length
        } domains.`,
      );
    },
  });
}

main();
