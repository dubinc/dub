import { prisma } from "@dub/prisma";
import { PartnerNotificationPreferences } from "@dub/prisma/client";

type PartnerNotificationPreference = keyof Omit<
  PartnerNotificationPreferences,
  "id" | "partnerUserId"
>;

interface GetPartnerUsersParams {
  partnerIds: string[];
  notificationPreference?: PartnerNotificationPreference;
}

export async function getPartnerUsers({
  partnerIds,
  notificationPreference,
}: GetPartnerUsersParams) {
  if (partnerIds.length === 0) {
    return [];
  }

  const partnerUsers = await prisma.partnerUser.findMany({
    where: {
      partnerId: {
        in: partnerIds,
      },
      ...(notificationPreference && {
        notificationPreferences: {
          [notificationPreference]: true,
        },
      }),
      user: {
        email: {
          not: null,
        },
      },
    },
    select: {
      partner: {
        select: {
          id: true,
          name: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return partnerUsers;
}
