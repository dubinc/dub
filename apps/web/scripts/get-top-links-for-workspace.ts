import { getAnalytics } from "@/lib/analytics";
import prisma from "@/lib/prisma";
import { linkConstructor } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const workspace = await prisma.project.findUnique({
    where: {
      slug: "dub",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      usage: true,
      usageLimit: true,
      plan: true,
      billingCycleStart: true,
      users: {
        select: {
          user: true,
        },
      },
      domains: {
        where: {
          verified: true,
        },
      },
      sentEmails: true,
      createdAt: true,
    },
  });
  if (!workspace) {
    console.log("No workspace found");
    return;
  }
  const topLinks = await getAnalytics({
    workspaceId: workspace.id,
    endpoint: "top_links",
    interval: "30d",
    excludeRoot: true,
  }).then(async (data) => {
    const topFive = data.slice(0, 5);
    return await Promise.all(
      topFive.map(
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

  console.table(topLinks);
}

main();
