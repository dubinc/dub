import { prismaEdge } from "@/lib/prisma/edge";
import { UserProps } from "@/lib/types";

export async function getRefreshedUser(user: UserProps) {
  const refreshedUser = await prismaEdge.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      defaultWorkspace: true,
      onboardingStep: true,
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

  return refreshedUser;
}
