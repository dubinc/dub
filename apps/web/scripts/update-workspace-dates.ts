import { prisma } from "@dub/prisma";
import { redis } from "@/lib/upstash";
import "dotenv-flow/config";

async function main() {
  // original hash was migrated_links_users, we archived it to migrated_links_users_archived
  const migratedWorkspaces = await redis.hgetall<Record<string, string>>(
    "migrated_links_users", // migrated_links_users_archived
  );

  if (!migratedWorkspaces) {
    console.log("No workspaces to update");
    return;
  }

  const workspacesToUpdate = await Promise.all(
    Object.entries(migratedWorkspaces).map(async ([_userId, projectId]) => {
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
  ).then((workspaces) => workspaces.filter(Boolean));

  console.log(workspacesToUpdate);
}

main();
