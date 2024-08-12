import { prisma } from "@/lib/prisma";

interface InstallIntegrationArgs {
  userId: string;
  workspaceId: string;
  integrationSlug: string;
}

// Install an integration for a user in a workspace
export const installIntegration = async ({
  userId,
  workspaceId,
  integrationSlug,
}: InstallIntegrationArgs) => {
  const { id: integrationId } = await prisma.integration.findUniqueOrThrow({
    where: {
      slug: integrationSlug,
    },
    select: {
      id: true,
    },
  });

  await prisma.installedIntegration.upsert({
    create: {
      userId,
      projectId: workspaceId,
      integrationId,
    },
    update: {},
    where: {
      userId_integrationId_projectId: {
        userId,
        projectId: workspaceId,
        integrationId,
      },
    },
  });

  console.info(
    `Installed integration ${integrationSlug} for user ${userId} in workspace ${workspaceId}`,
  );
};
