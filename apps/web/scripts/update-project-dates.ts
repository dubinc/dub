import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import "dotenv-flow/config";

async function main() {
  // original hash was migrated_links_users, we archived it to migrated_links_users_archived
  const migratedProjects = await redis.hgetall<Record<string, string>>(
    "migrated_links_users", // migrated_links_users_archived
  );

  if (!migratedProjects) {
    console.log("No projects to update");
    return;
  }

  const projectsToUpdate = await Promise.all(
    Object.entries(migratedProjects).map(async ([_userId, projectId]) => {
      const earliestLink = await prisma.link.findFirst({
        where: {
          projectId,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          createdAt: true,
        },
      });

      if (!earliestLink) {
        return null;
      }

      return await prisma.project.update({
        where: {
          id: projectId,
        },
        data: {
          createdAt: earliestLink.createdAt,
        },
      });
    }),
  ).then((projects) => projects.filter(Boolean));

  console.log(projectsToUpdate);
}

main();
