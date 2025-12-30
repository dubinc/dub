import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  // Find all projects that don't have any ProjectUsers
  const projectsWithoutUsers = await prisma.project.findMany({
    where: {
      users: {
        none: {},
      },
      plan: "free",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 25, // to avoid overwhelming the queue
  });

  console.log(`Found ${projectsWithoutUsers.length} projects without users.`);

  if (projectsWithoutUsers.length === 0) {
    return;
  }

  console.table(
    projectsWithoutUsers.map((project) => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
      plan: project.plan,
      createdAt: project.createdAt.toISOString(),
    })),
  );

  const baseDelay = 30;

  for (let i = 0; i < projectsWithoutUsers.length; i++) {
    const project = projectsWithoutUsers[i];
    const delay = baseDelay * Math.pow(2, i); // Exponential: 30s, 60s, 120s, 240s, etc.

    const response = await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/workspaces/delete`,
      body: {
        workspaceId: project.id,
      },
      delay,
    });

    console.log(
      `Queued deletion for project ${project.id} (${project.slug}) with ${delay}s delay (messageId: ${response.messageId})`,
    );
  }
}

main();
