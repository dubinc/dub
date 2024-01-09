import "dotenv-flow/config";
import prisma from "@/lib/prisma";

async function main() {
  const projects = await prisma.link
    .groupBy({
      by: ["projectId"],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 100,
    })
    .then(
      async (projects) =>
        await Promise.all(
          projects.map(async ({ _count, projectId }) => {
            if (!projectId) {
              return;
            }
            const project = await prisma.project.findUnique({
              where: {
                id: projectId,
              },
              select: {
                slug: true,
                plan: true,
              },
            });
            return {
              project: project?.slug,
              plan: project?.plan,
              links: _count.id,
            };
          }),
        ),
    );

  console.table(projects);
}

main();
