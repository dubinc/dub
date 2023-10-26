import "dotenv-flow/config";
import * as Papa from "papaparse";
import * as fs from "fs";
import prisma from "@/lib/prisma";

const domainClicks: { domain: string; clicks: string }[] = [];

async function main() {
  Papa.parse(fs.createReadStream("sql.csv", "utf-8"), {
    header: true,
    step: (result: { data: { domain: string; clicks: string } }) => {
      domainClicks.push(result.data);
    },
    complete: async () => {
      console.table(domainClicks.slice(0, 50));
      domainClicks.forEach(async (domainClick) => {
        const { domain, clicks } = domainClick;
        try {
          await prisma.domain.update({
            where: {
              slug: domain,
            },
            data: {
              clicks: parseInt(clicks),
            },
          });
          console.log(`Updated ${domain} with ${clicks} clicks.`);
        } catch (e) {
          console.log(`${domain} doesn't exist, skipping.`);
        }
      });
    },
  });
}

main();
