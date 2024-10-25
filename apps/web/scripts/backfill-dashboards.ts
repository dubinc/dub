import { createId } from "@/lib/api/utils";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN } from "@dub/utils";
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
    take: 50,
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
        ...link,
        dashboardUrl: `${APP_DOMAIN}/share/${dashboard.id}`,
      };
    }),
  );

  console.table(results);
}

main();
