import "dotenv-flow/config";
import prisma from "@/lib/prisma";

async function main() {
  const projects = await prisma.project.findMany({
    select: {
      slug: true,
      plan: true,
      usage: true,
      domains: {
        select: {
          slug: true,
        },
      },
      _count: {
        select: {
          links: true,
          domains: true,
        },
      },
    },
    orderBy: {
      usage: "desc",
    },
    take: 100,
  });
  console.table(
    // sort by links count
    projects
      // .sort((a, b) => b._count.links - a._count.links)
      .map((project) => ({
        ...project,
        domains: `${
          project.domains
            .slice(0, 2)
            .map((domain) => domain.slug)
            .join(", ") +
          (project.domains.length > 2
            ? `... ${project._count.domains - 2}+`
            : "")
        }`,
      })),
    ["slug", "plan", "usage", "_count"],
  );
}

main();
