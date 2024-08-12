import { prisma } from "@/lib/prisma";

interface UninstallIntegrationArgs {
  userId?: string;
  workspaceId: string;
  integrationSlug: string;
}

// Uninstall an integration for a user in a workspace
export const uninstallIntegration = async ({
  userId,
  workspaceId,
  integrationSlug,
}: UninstallIntegrationArgs) => {
  const { id: integrationId } = await prisma.integration.findUniqueOrThrow({
    where: {
      slug: integrationSlug,
    },
    select: {
      id: true,
    },
  });

  await prisma.installedIntegration.deleteMany({
    where: {
      ...(userId && { userId }),
      projectId: workspaceId,
      integrationId,
    },
  });

  console.info(
    `Uninstalled integration ${integrationSlug} for user ${userId} in workspace ${workspaceId}`,
  );
};
