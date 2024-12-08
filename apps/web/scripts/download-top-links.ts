import { getAnalytics } from "@/lib/analytics/get-analytics";
import { prisma } from "@dub/prisma";
import { linkConstructor } from "@dub/utils";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

async function main() {
  const topLinks = await getAnalytics({
    event: "clicks",
    groupBy: "top_links",
    workspaceId: "xxx",
    interval: "30d",
    root: false,
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
