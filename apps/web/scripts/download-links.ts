import "dotenv-flow/config";
import prisma from "@/lib/prisma";
import * as Papa from "papaparse";
import * as fs from "fs";
import { linkConstructor } from "./utils";

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
    orderBy: {
      createdAt: "asc",
    },
    skip: 99999,
  });

  const processedLinks = links.map(({ key, domain, url }) => ({
    link: linkConstructor({
      domain,
      key,
    }),
    url,
  }));

  fs.writeFileSync("xxx.csv", Papa.unparse(processedLinks));
}

main();
