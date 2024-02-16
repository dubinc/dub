import { getAnalytics } from "@/lib/analytics";
import prisma from "@/lib/prisma";
import "dotenv-flow/config";
import { linkConstructor } from "./utils";

async function main() {
  const project = await prisma.project.findUnique({
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
  if (!project) {
    console.log("No project found");
    return;
  }
  const topLinks = await getAnalytics({
    projectId: project.id,
    endpoint: "top_links",
    interval: "30d",
    excludeRoot: "true",
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
