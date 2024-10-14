import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  const domains = await prisma.domain.findMany({
    where: {
      notFoundUrl: null,
      project: {
        plan: {
          not: "free",
        },
      },
      links: {
        some: {
          key: "_root",
          url: {
            not: "",
          },
        },
      },
    },
    select: {
      id: true,
      slug: true,
      notFoundUrl: true,
      project: {
        select: {
          slug: true,
          plan: true,
        },
      },
      links: {
        select: {
          key: true,
          url: true,
        },
        where: {
          key: "_root",
        },
      },
    },
    take: 10,
    orderBy: {
      createdAt: "asc",
    },
  });

  const updatedDomains = await Promise.all(
    domains.map((domain) => {
      return prisma.domain.update({
        where: { id: domain.id },
        data: { notFoundUrl: domain.links[0].url },
        select: {
          id: true,
          slug: true,
          notFoundUrl: true,
          project: {
            select: {
              slug: true,
              plan: true,
            },
          },
        },
      });
    }),
  );

  console.table(updatedDomains);
}

main();
