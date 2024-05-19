import { prismaEdge } from "@/lib/prisma/edge";
import { UserProps } from "@/lib/types";

export async function getDefaultWorkspace(user: UserProps) {
  let defaultWorkspace = user?.defaultWorkspace;

  if (!defaultWorkspace) {
    const refereshedUser = await prismaEdge.user.findUnique({
      where: {
        id: user.id,
      },
    });
    defaultWorkspace = refereshedUser?.defaultWorkspace || undefined;
  }

  return defaultWorkspace;
}
