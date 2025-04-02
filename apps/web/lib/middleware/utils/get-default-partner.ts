import { UserProps } from "@/lib/types";
import { prismaEdge } from "@dub/prisma/edge";

export async function getDefaultPartnerId(user: UserProps) {
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

    // if no default partner id, try and see if there is a partner profile with the same email
    // if there is, link the user to the partner profile and set it as the user's default partner id
    if (!defaultPartnerId) {
      console.log(
        "User doesn't have a default partner id, trying to find a partner with the same email",
      );

      const partner = await prismaEdge.partner.findUnique({
        where: {
          email: user.email,
        },
      });

      // if there is already a partner profile with the same email + has a country assigned
      // link the user to the partner profile
      // else they need to either create a new partner profile or set their country
      if (partner?.country) {
        await prismaEdge.user.update({
          where: {
            id: user.id,
          },
          data: {
            defaultPartnerId: partner.id,
            partners: {
              create: {
                partnerId: partner.id,
                role: "owner",
              },
            },
          },
        });
        defaultPartnerId = partner.id;
      }
    }
  }

  return defaultPartnerId;
}
