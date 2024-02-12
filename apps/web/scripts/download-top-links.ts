import "dotenv-flow/config";
import * as Papa from "papaparse";
import * as fs from "fs";
import prisma from "@/lib/prisma";
import { linkConstructor } from "./utils";
import { getStats } from "@/lib/stats";

async function main() {
  const topLinks = await getStats({
    projectId: "xxx",
    endpoint: "top_links",
    interval: "30d",
    excludeRoot: "true",
  }).then(async (data) => {
    return await Promise.all(
      data.map(
        async ({ link: linkId, clicks }: { link: string; clicks: number }) => {
          const link = await prisma.link.findUnique({
            where: {
              id: linkId,
            },
            select: {
              domain: true,
              key: true,
            },
          });
          if (!link) return;
          return {
            link: linkConstructor({
              domain: link.domain,
              key: link.key,
              pretty: true,
            }),
            clicks,
          };
        },
      ),
    );
  });

  fs.writeFileSync("xxx.csv", Papa.unparse(topLinks));
}

main();
