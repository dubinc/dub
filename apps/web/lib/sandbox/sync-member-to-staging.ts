import { prisma } from "@dub/prisma";
import { WorkspaceRole } from "@dub/prisma/client";

export async function addMemberToStaging({
  liveWorkspaceId,
  userId,
  role,
}: {
  liveWorkspaceId: string;
  userId: string;
  role: WorkspaceRole;
}) {
  const liveWorkspace = await prisma.project.findUnique({
    where: {
      id: liveWorkspaceId,
    },
    select: {
      stagingWorkspaceId: true,
    },
  });

  if (!liveWorkspace?.stagingWorkspaceId) return;

  try {
    await prisma.projectUsers.create({
      data: {
        projectId: liveWorkspace.stagingWorkspaceId,
        userId,
        role,
        notificationPreference: {
          create: {},
        },
      },
    });
  } catch (e) {
    // P2002: unique constraint violation — user already exists in staging
    if ((e as any)?.code === "P2002") return;
    throw e;
  }
}

export async function removeMemberFromStaging({
  liveWorkspaceId,
  userId,
}: {
  liveWorkspaceId: string;
  userId: string;
}) {
  const liveWorkspace = await prisma.project.findUnique({
    where: {
      id: liveWorkspaceId,
    },
    select: {
      stagingWorkspaceId: true,
    },
  });

  if (!liveWorkspace?.stagingWorkspaceId) return;

  await prisma.projectUsers.deleteMany({
    where: {
      projectId: liveWorkspace.stagingWorkspaceId,
      userId,
    },
  });
}

export async function updateMemberRoleInStaging({
  liveWorkspaceId,
  userId,
  role,
}: {
  liveWorkspaceId: string;
  userId: string;
  role: WorkspaceRole;
}) {
  const liveWorkspace = await prisma.project.findUnique({
    where: {
      id: liveWorkspaceId,
    },
    select: {
      stagingWorkspaceId: true,
    },
  });

  if (!liveWorkspace?.stagingWorkspaceId) return;

  await prisma.projectUsers.updateMany({
    where: {
      projectId: liveWorkspace.stagingWorkspaceId,
      userId,
    },
    data: {
      role,
    },
  });
}
