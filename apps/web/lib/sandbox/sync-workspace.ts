import { prisma } from "@/lib/prisma";
import { Project, WorkspaceRole } from "@prisma/client";

// We don't sync the machine user from the production workspace to the staging workspace
export async function syncWorkspaceMemberToStaging({
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
    console.error("[syncWorkspaceMemberToStaging]", error);
  }
}

export async function syncWorkspaceMemberRoleToStaging({
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
    console.error("[syncWorkspaceMemberRoleToStaging]", error);
  }
}

export async function removeWorkspaceMemberFromStaging({
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
    console.error("[removeWorkspaceMemberFromStaging]", error);
  }
}

export async function syncWorkspaceSettingsToStaging(
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
    console.error("[syncWorkspaceSettingsToStaging]", error);
  }
}

export async function syncWorkspacePlanToStaging(
  workspace: Pick<
    Project,
    "stagingWorkspaceId" | "plan" | "planTier" | "planPeriod"
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
        plan: workspace.plan,
        planTier: workspace.planTier,
        planPeriod: workspace.planPeriod,
      },
    });
  } catch (error) {
    console.error("[syncWorkspacePlanToStaging]", error);
  }
}
