import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { generateRandomString } from "../utils/generate-random-string";
import { createWorkspaceId } from "./create-workspace-id";

export async function createStagingWorkspace(workspaceId: string) {
  const workspace = await prisma.project.findUnique({
    where: {
      id: workspaceId,
    },
    include: {
      users: {
        select: {
          role: true,
          userId: true,
        },
      },
    },
  });

  if (!workspace) {
    console.error(
      "Failed to find workspace in createStagingWorkspace",
      workspaceId,
    );
    return;
  }

  if (workspace.stagingWorkspaceId) {
    console.log(
      `Staging workspace already exists for the workspace ${workspace.id}.`,
    );
    return;
  }

  const { canUseStagingWorkspace } = getPlanCapabilities(workspace.plan);

  if (!canUseStagingWorkspace) {
    console.log(
      `The workspace ${workspace.id} does not have required plan to use staging workspace.`,
    );
    return;
  }

  // TODO:
  // Add the limit

  const stagingWorkspaceId = createWorkspaceId();

  await prisma.$transaction([
    // Create a staging workspace
    prisma.project.create({
      data: {
        id: stagingWorkspaceId,
        name: `${workspace.name} [STAGING]`,
        slug: `${workspace.slug}-staging`,
        logo: workspace.logo,
        plan: workspace.plan,
        billingCycleStart: new Date().getDate(),
        invoicePrefix: generateRandomString(8),
        inviteCode: nanoid(24),
        defaultDomains: {
          create: {},
        },
      },
    }),

    // Update live to point to the staging workspace
    prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        stagingWorkspaceId,
      },
    }),
  ]);

  // Copy the users to the staging workspace
  const { users } = workspace;

  if (users.length > 0) {
    await prisma.projectUsers.createMany({
      data: users.map((user) => ({
        projectId: stagingWorkspaceId,
        role: user.role,
        userId: user.userId,
        notificationPreference: {
          create: {},
        },
      })),
      skipDuplicates: true,
    });
  }
}
