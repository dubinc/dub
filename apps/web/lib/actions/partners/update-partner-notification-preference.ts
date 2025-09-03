"use server";

import { partnerNotificationTypes } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import z from "../../zod";
import { authPartnerActionClient } from "../safe-action";

const schema = z.object({
  type: partnerNotificationTypes,
  value: z.boolean(),
});

// Update the notification preference for a partner+user
export const updatePartnerNotificationPreference = authPartnerActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { user, partner } = ctx;
    const { type, value } = parsedInput;

    await prisma.partnerUser.update({
      where: {
        userId_partnerId: {
          userId: user.id,
          partnerId: partner.id,
        },
      },
      data: {
        notificationPreferences: {
          update: {
            [type]: value,
          },
        },
      },
    });

    return { ok: true };
  });
