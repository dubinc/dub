import "dotenv-flow/config";
import prisma from "@/lib/prisma";
import { getStats } from "@/lib/stats";
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
  const topLinks = await getStats({
    domain: project.domains.map((domain) => domain.slug).join(","),
    endpoint: "top_links",
    interval: "30d",
  }).then((data) =>
    data
      .slice(0, 5)
      .map(
        ({
          domain,
          key,
          clicks,
        }: {
          domain: string;
          key: string;
          clicks: number;
        }) => ({
          link: linkConstructor({ domain, key, pretty: true }),
          clicks,
        }),
      ),
  );

  console.table(topLinks);
}

main();
