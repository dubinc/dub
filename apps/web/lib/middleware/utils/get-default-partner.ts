import { prismaEdge } from "@/lib/prisma/edge";
import { UserProps } from "@/lib/types";

export async function getDefaultPartner(user: UserProps) {
  const refreshedUser = await prismaEdge.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      partners: {
        select: {
          partner: {
            select: {
              id: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  return refreshedUser?.partners[0]?.partner?.id || undefined;
}
