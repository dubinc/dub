import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { AnalyticsCountries, AnalyticsTopLinks } from "dub/models/components";
import { getAnalytics } from "../lib/analytics/get-analytics";

async function main() {
  const seeded = await prisma.yearInReview
    .findMany({
      where: {
        year: 2024,
      },
      select: {
        workspaceId: true,
      },
    })
    .then((data) => data.map(({ workspaceId }) => workspaceId));

  // get projects with links created in 2024 and have clicks
  const data = await prisma.link
    .groupBy({
      by: ["projectId"],
      where: {
        createdAt: {
          gte: new Date("2024-01-01"),
          lte: new Date("2024-12-31"),
        },
        AND: [
          {
            projectId: {
              not: null,
            },
          },
          {
            projectId: {
              notIn: seeded,
            },
          },
        ],
      },
      _count: {
        id: true,
      },
      _sum: {
        clicks: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 20,
    })
    // only get projects with at least 5 links created in 2024
    .then((data) => data.filter(({ _count }) => _count.id >= 5));

  const payloads = await Promise.all(
    data.map(async ({ projectId, _count, _sum }) => {
      const [topLinks, topCountries] = (await Promise.all([
        getAnalytics({
          workspaceId: projectId!,
          event: "clicks",
          groupBy: "top_links",
          interval: "ytd",
          root: false,
        }),
        getAnalytics({
          workspaceId: projectId!,
          event: "clicks",
          groupBy: "countries",
          interval: "ytd",
        }),
      ])) as [AnalyticsTopLinks[], AnalyticsCountries[]];

      return {
        year: 2024,
        workspaceId: projectId!,
        totalLinks: _count.id,
        totalClicks: _sum.clicks ?? 0,
        topLinks: topLinks.slice(0, 5).map(({ domain, key, clicks }) => ({
          item: `${domain}/${key}`,
          count: clicks,
        })),
        topCountries: topCountries.slice(0, 5).map(({ country, clicks }) => ({
          item: country,
          count: clicks,
        })),
      };
    }),
  );

  console.table(payloads);

  await prisma.yearInReview.createMany({
    data: payloads,
  });
}

// watch -n 10 npm run script dub-wrapped
main();
