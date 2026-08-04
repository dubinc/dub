import { SessionUser } from "@/lib/better-auth/get-session";
import { prismaEdge } from "@/lib/prisma/edge";

export async function getDefaultWorkspace(
  user: Pick<SessionUser, "id" | "defaultWorkspace">,
) {
  let defaultWorkspace = user.defaultWorkspace ?? undefined;

  if (!defaultWorkspace) {
    const refreshedUser = await prismaEdge.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        defaultWorkspace: true,
        projects: {
          select: {
            project: {
              select: {
                slug: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    defaultWorkspace =
      refreshedUser?.defaultWorkspace ||
      refreshedUser?.projects[0]?.project?.slug ||
      undefined;
  }

  return defaultWorkspace;
}
