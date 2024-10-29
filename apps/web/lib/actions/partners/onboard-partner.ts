"use server";

import { createId } from "@/lib/api/utils";
import { prisma } from "@/lib/prisma";
import z from "../../zod";
import { authUserActionClient } from "../safe-action";

const onboardPartnerSchema = z.object({
  name: z.string(),
});

// Update the notification preference for a user in a workspace
export const onboardPartner = authUserActionClient
  .schema(onboardPartnerSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;
    const { name } = parsedInput;

    try {
      const partner = await prisma.partner.create({
        data: {
          id: createId({ prefix: "pn_" }),
          name,
          users: {
            create: {
              userId: user.id,
              role: "owner",
            },
          },
        },
      });
      return { ok: true, partnerId: partner.id };
    } catch (e) {
      return {
        ok: false,
      };
    }
  });
