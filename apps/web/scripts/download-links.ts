import { prisma } from "@dub/prisma";
import { linkConstructor } from "@dub/utils";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

const projectId = "xxx";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      projectId,
    },
    select: {
      domain: true,
      key: true,
      url: true,
      clicks: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const processedLinks = links.map(
    ({ key, domain, url, clicks, createdAt }) => ({
      link: linkConstructor({
        domain,
        key,
      }),
      url,
      clicks,
      createdAt: createdAt.toISOString(),
    }),
  );

  fs.writeFileSync("xxx.csv", Papa.unparse(processedLinks));
}

main();
