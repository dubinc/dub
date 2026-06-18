import { prisma } from "@/lib/prisma";
import { Project, WorkspaceRole } from "@prisma/client";

// We don't sync the machine user from the production workspace to the staging workspace

export async function addMemberToStaging({
  workspace,
  user,
}: {
  workspace: Pick<Project, "stagingWorkspaceId">;
  user: { id: string; role: WorkspaceRole };
}) {
  if (!workspace.stagingWorkspaceId) {
    return;
  }

  try {
    await prisma.projectUsers.create({
      data: {
        projectId: workspace.stagingWorkspaceId,
        userId: user.id,
        role: user.role,
        notificationPreference: {
          create: {},
        },
      },
    });
  } catch (error) {
    console.error("[addMemberToStaging]", error);
  }
}

export async function updateMemberRoleInStaging({
  workspace,
  user,
}: {
  workspace: Pick<Project, "stagingWorkspaceId">;
  user: { id: string; role: WorkspaceRole };
}) {
  if (!workspace.stagingWorkspaceId) {
    return;
  }

  try {
    await prisma.projectUsers.update({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: workspace.stagingWorkspaceId,
        },
      },
      data: {
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[updateMemberRoleInStaging]", error);
  }
}

export async function removeMemberFromStaging({
  workspace,
  user,
}: {
  workspace: Pick<Project, "stagingWorkspaceId">;
  user: { id: string; isMachine: boolean };
}) {
  if (!workspace.stagingWorkspaceId || user.isMachine) {
    return;
  }

  try {
    await Promise.allSettled([
      prisma.projectUsers.delete({
        where: {
          userId_projectId: {
            userId: user.id,
            projectId: workspace.stagingWorkspaceId,
          },
        },
      }),

      prisma.restrictedToken.deleteMany({
        where: {
          projectId: workspace.stagingWorkspaceId,
          userId: user.id,
        },
      }),
    ]);
  } catch (error) {
    console.error("[removeMemberFromStaging]", error);
  }
}

export async function syncWorkspaceSettings(
  workspace: Pick<
    Project,
    "id" | "stagingWorkspaceId" | "name" | "slug" | "logo"
  >,
) {
  if (!workspace.stagingWorkspaceId) {
    return;
  }

  try {
    await prisma.project.update({
      where: {
        id: workspace.stagingWorkspaceId,
      },
      data: {
        logo: workspace.logo,
        name: `${workspace.name} (Staging)`,
        slug: `${workspace.slug}-staging`,
      },
    });
  } catch (error) {
    console.error("[syncWorkspaceSettings]", error);
  }
}
