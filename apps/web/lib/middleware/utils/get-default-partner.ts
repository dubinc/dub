import { UserProps } from "@/lib/types";
import { prismaEdge } from "@dub/prisma/edge";

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
