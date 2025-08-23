import { prisma } from "@dub/prisma";
import { Role } from "@prisma/client";
import { z } from "zod";
import { notificationTypes } from "../zod/schemas/workspaces";

type GetWorkspaceUsersParams =
  | {
      workspaceId: string;
      programId?: never;
      role: Role;
      notificationPreference?: z.infer<typeof notificationTypes>;
    }
  | {
      programId: string;
      workspaceId?: never;
      role: Role;
      notificationPreference?: z.infer<typeof notificationTypes>;
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
      programs: {
        select: {
          name: true,
          slug: true,
          supportEmail: true,
        },
      },
      users: {
        where: {
          role,
          ...(notificationPreference && {
            notificationPreference: {
              [notificationPreference]: true,
            },
          }),
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

  const program = workspace.programs.length > 0 ? workspace.programs[0] : null;

  return {
    id: workspace.id,
    slug: workspace.slug,
    name: workspace.name,
    program,
    users: workspace.users
      .map(({ user }) => user)
      .filter((user) => user.email)
      .map((user) => ({
        name: user.name,
        email: user.email!,
      })),
  };
}
