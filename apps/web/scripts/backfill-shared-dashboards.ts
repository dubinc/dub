import { createId } from "@/lib/api/utils";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      publicStats: true,
      sharedDashboard: null,
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
      createdAt: "desc",
    },
    take: 50,
  });

  const results = await Promise.all(
    links.map(async (link) => {
      const sharedDashboard = await prisma.sharedDashboard.create({
        data: {
          id: createId({ prefix: "dsh_" }),
          linkId: link.id,
          showConversions: link.trackConversion,
          projectId: link.projectId,
          userId: link.userId,
        },
      });

      return {
        ...link,
        sharedDashboardUrl: `${APP_DOMAIN}/share/${sharedDashboard.id}`,
      };
    }),
  );

  console.table(results);
}

main();
