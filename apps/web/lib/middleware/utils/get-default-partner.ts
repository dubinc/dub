import { UserProps } from "@/lib/types";
import { prismaEdge } from "@dub/prisma/edge";

export async function getDefaultPartner(user: UserProps) {
  let defaultPartnerId = user?.defaultPartnerId;

  if (!defaultPartnerId) {
    const refreshedUser = await prismaEdge.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        defaultPartnerId: true,
        partners: {
          select: {
            partnerId: true,
          },
          take: 1,
        },
      },
    });

    defaultPartnerId =
      refreshedUser?.defaultPartnerId ||
      refreshedUser?.partners[0]?.partnerId ||
      undefined;
  }

  return defaultPartnerId;
}
