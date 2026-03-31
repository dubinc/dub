import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  // Find all projects that don't have any ProjectUsers
  const workspacesWithoutUsers = await prisma.project.findMany({
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

  console.log(`Found ${workspacesWithoutUsers.length} projects without users.`);

  if (workspacesWithoutUsers.length === 0) {
    return;
  }

  console.table(
    workspacesWithoutUsers.map((project) => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
      plan: project.plan,
      createdAt: project.createdAt.toISOString(),
    })),
  );

  const delayIncrement = 30;

  for (let i = 0; i < workspacesWithoutUsers.length; i++) {
    const project = workspacesWithoutUsers[i];
    const delay = delayIncrement * (i + 1);

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
