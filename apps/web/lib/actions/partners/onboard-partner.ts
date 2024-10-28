"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import z from "../../zod";
import { authUserActionClient } from "../safe-action";

const onboardPartnerSchema = z.object({
  name: z.string(),
  slug: z.string(),
});

// Update the notification preference for a user in a workspace
export const onboardPartner = authUserActionClient
  .schema(onboardPartnerSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;
    const { name, slug } = parsedInput;

    try {
      const partner = await prisma.partner.create({
        data: {
          name,
          slug,
          users: {
            create: {
              userId: user.id,
              role: "owner",
            },
          },
        },
      });
      return { ok: true, slug: partner.slug };
    } catch (e) {
      const slugConflict =
        e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
      return {
        ok: false,
        slugConflict,
      };
    }
  });
