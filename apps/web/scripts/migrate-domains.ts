import { createLink } from "@/lib/api/links";
import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

// Standardize domains into links
async function main() {
  const domains = await prisma.domain.findMany({
    include: {
      project: {
        select: {
          id: true,
          plan: true,
          users: {
            select: {
              id: true,
            },
          },
        },
      },
    },
    take: 5000, // TODO: Adjust this based on the number of domains
  });

  const promises = domains.map(async (domain) => {
    const user = domain?.project?.users[0];
    const workspace = domain.project!;

    const link = await createLink({
      id: domain.id,
      domain: domain.slug,
      key: "_root",
      description: domain.description,
      publicStats: domain.publicStats,
      projectId: domain.projectId,
      userId: user?.id,
      createdAt: domain.createdAt,
      ...(workspace.plan === "free"
        ? {
            url: "",
            expiredUrl: null,
            rewrite: false,
            noindex: false,
          }
        : {
            url: domain.target || "",
            expiredUrl: domain.expiredUrl || null,
            rewrite: domain.type === "rewrite",
            noindex: domain.noindex,
          }),
      archived: false,
      proxy: false,
      trackConversion: false,
    });

    return await prisma.link.update({
      where: {
        id: link.id,
      },
      data: {
        lastClicked: domain.lastClicked,
        clicks: domain.clicks,
      },
    });
  });

  const result = await Promise.allSettled(promises);

  console.log(result);
}

main();
