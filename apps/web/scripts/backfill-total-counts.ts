import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";

async function main() {
  const where: Prisma.ProjectWhereInput = {
    linksUsage: 0,
    totalLinks: 0,
    // not within the last 2 hours
    updatedAt: {
      lt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  };
  const projectsToUpdate = await prisma.project.findMany({
    where,
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 50,
  });

  const results = await Promise.all(
    projectsToUpdate.map(async (project) => {
      const totalLinks = await prisma.link.count({
        where: {
          projectId: project.id,
        },
      });

      return await prisma.project.update({
        where: {
          id: project.id,
        },
        data: {
          totalLinks,
          ...(totalLinks === 0 && {
            linksUsage: 0,
          }),
        },
        select: {
          slug: true,
          totalLinks: true,
        },
      });
    }),
  );

  console.table(results);
  const projectLeft = await prisma.project.count({
    where,
  });
  console.log(`${projectLeft} projects left to update`);
}

main();
