import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      projectId: "xxx",
      archived: false,
      folderId: null,
      domain: "xxx",
      clicks: {
        gt: 0,
      },
      key: {
        not: "_root",
      },
    },
    select: {
      id: true,
      shortLink: true,
      key: true,
      externalId: true,
      clicks: true,
      createdAt: true,
    },
    orderBy: {
      clicks: "desc",
    },
  });
  console.log(links.length);

  fs.writeFileSync("xxx.csv", Papa.unparse(links));
}

main();
