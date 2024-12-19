import { createId } from "@/lib/api/utils";
import { prisma } from "@dub/prisma";
import { getPrettyUrl, truncate } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      publicStats: true,
      dashboard: null,
    },
    select: {
      id: true,
      shortLink: true,
      clicks: true,
      trackConversion: true,
      projectId: true,
      userId: true,
    },
    orderBy: {
      clicks: "desc",
    },
    take: 500,
  });

  const results = await Promise.all(
    links.map(async (link) => {
      const dashboard = await prisma.dashboard.create({
        data: {
          id: createId({ prefix: "dash_" }),
          linkId: link.id,
          projectId: link.projectId,
          userId: link.userId,
          showConversions: link.trackConversion,
        },
      });

      return {
        shortLink: truncate(getPrettyUrl(link.shortLink), 24),
        clicks: link.clicks,
        dashboardUrl: `https://preview.dub.co/share/${dashboard.id}`,
      };
    }),
  );

  const remaining = await prisma.link.count({
    where: {
      publicStats: true,
      dashboard: null,
    },
  });

  console.table(results);
  console.log(`${remaining} remaining`);
}

main();
