import { prisma } from "@/lib/prisma";
import { DUB_WORKSPACE_ID } from "@dub/utils";

export const getDubAdminRole = async (userId: string) => {
  const response = await prisma.projectUsers.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId: DUB_WORKSPACE_ID,
      },
    },
    select: {
      role: true,
    },
  });

  if (!response) {
    return null;
  }
  return response.role;
};
