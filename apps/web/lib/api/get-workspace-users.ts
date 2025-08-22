import { prisma } from "@dub/prisma";
import { NotificationPreference, Role } from "@prisma/client";

type GetWorkspaceUsersParams =
  | {
      workspaceId: string;
      programId?: never;
      role: Role;
      notificationPreference?: NotificationPreference;
    }
  | {
      programId: string;
      workspaceId?: never;
      role: Role;
      notificationPreference?: NotificationPreference;
    };

export async function getWorkspaceUsers({
  workspaceId,
  programId,
  role,
  notificationPreference,
}: GetWorkspaceUsersParams) {
  if (!workspaceId && !programId) {
    throw new Error("Either workspaceId or programId must be provided.");
  }

  const workspace = await prisma.project.findUnique({
    where: {
      ...(workspaceId
        ? {
            id: workspaceId,
          }
        : {
            defaultProgramId: programId,
          }),
    },
    select: {
      id: true,
      slug: true,
      name: true,
      users: {
        where: {
          role,
          ...(notificationPreference && { notificationPreference }),
        },
        select: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!workspace) {
    throw new Error(`Workspace ${workspaceId} not found.`);
  }

  return {
    id: workspace.id,
    slug: workspace.slug,
    name: workspace.name,
    users: workspace.users
      .map(({ user }) => user)
      .filter((user) => user.email)
      .map((user) => ({
        name: user.name,
        email: user.email!,
      })),
  };
}
