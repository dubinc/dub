import "dotenv-flow/config";
import prisma from "@/lib/prisma";
import * as Papa from "papaparse";
import * as fs from "fs";

const projectId = "xxx";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      projectId,
    },
    select: {
      key: true,
      domain: true,
      url: true,
    },
  });

  const processedLinks = links.map(({ key, domain, url }) => ({
    link: `${domain}:${key}`,
    url,
  }));

  fs.writeFileSync("links.csv", Papa.unparse(processedLinks));
}

main();
