import "dotenv-flow/config";
import prisma from "@/lib/prisma";
import * as Papa from "papaparse";
import * as fs from "fs";
import { LinkProps } from "@/lib/types";
import { bulkCreateLinks } from "@/lib/api/links";

const domain = "xxx";
const csvLinks: LinkProps[] = [];

async function main() {
  //   const links = await prisma.link.findMany({
  //     where: {
  //       domain,
  //     },
  //   });

  //   // save to csv
  //   const csv = Papa.unparse(links, {
  //     header: true,
  //   });
  //   fs.writeFileSync("backup-links.csv", csv);

  // read from csv
  Papa.parse(fs.createReadStream("backup-links.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: { data: any }) => {
      csvLinks.push({
        ...result.data,
        archived: result.data.archived === "true",
        proxy: result.data.proxy === "true",
        rewrite: result.data.rewrite === "true",
        publicStats: result.data.publicStats === "true",
        checkDisabled: result.data.checkDisabled === "true",
        clicks: parseInt(result.data.clicks),
        lastChecked:
          result.data.lastChecked.length > 0 ? result.data.lastChecked : null,
        lastClicked:
          result.data.lastClicked.length > 0 ? result.data.lastClicked : null,
      });
    },
    complete: async () => {
      console.log(csvLinks.length);
      console.table(csvLinks.slice(0, 10), [
        "id",
        "domain",
        "key",
        "url",
        "archived",
        "proxy",
        "rewrite",
        "publicStats",
        "checkDisabled",
        "clicks",
      ]);
      await bulkCreateLinks(csvLinks);
    },
  });
}

main();
