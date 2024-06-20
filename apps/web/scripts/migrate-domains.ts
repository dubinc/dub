import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

// Standardize domains into links
async function main() {
  const domains = await prisma.domain.findMany({
    where: {
      projectId: "cl7wsy2836920mjrb352g5wfx",
    },
    include: {
      project: {
        select: {
          id: true,
          plan: true,
          users: {
            select: {
              userId: true,
            },
            take: 1,
          },
        },
      },
    },
    // take: 5000, // TODO: Adjust this based on the number of domains
  });

  // Create links for each domain
  const newLinks = domains.map((domain) => {
    return {
      id: domain.id,
      domain: domain.slug,
      key: "_root",
      url: domain.target || "",
      description: domain.description,
      publicStats: domain.publicStats,
      projectId: domain.projectId,
      userId: domain.project?.users[0].userId,
      createdAt: domain.createdAt,
      lastClicked: domain.lastClicked,
      clicks: domain.clicks,
      ...(domain.project?.plan === "free"
        ? {
            expiredUrl: null,
            rewrite: false,
            noindex: false,
          }
        : {
            expiredUrl: domain.expiredUrl || null,
            rewrite: domain.type === "rewrite",
            noindex: domain.noindex,
          }),
    };
  });
  console.log(newLinks);

  const result = await prisma.link.createMany({
    data: newLinks,
    skipDuplicates: true,
  });

  console.log(`Added ${result.count} links`);

  // const links = await prisma.link.deleteMany({
  //   where: {
  //     projectId: "cl7wsy2836920mjrb352g5wfx",
  //     key: "_root",
  //   },
  // });

  // console.log(links);
}

main();
