"use server";

import { getPartnerOrThrow } from "@/lib/api/partners/get-partner-or-throw";
import { userIsInBeta } from "@/lib/edge-config";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { nanoid } from "nanoid";
import z from "../../zod";
import { authUserActionClient } from "../safe-action";

const onboardPartnerSchema = z.object({
  partnerId: z.string(),
  name: z.string(),
  logo: z.string().nullable(),
  description: z.string().nullable(),
});

// Update a partner profile
export const updatePartnerProfile = authUserActionClient
  .schema(onboardPartnerSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;

    const { partner } = await getPartnerOrThrow({
      partnerId: parsedInput.partnerId,
      userId: user.id,
    });

    const partnersPortalEnabled = await userIsInBeta(
      user.email,
      "partnersPortal",
    );
    if (!partnersPortalEnabled) {
      return {
        ok: false,
        error: "Partners portal feature flag disabled.",
      };
    }

    const { name, logo, description } = parsedInput;

    try {
      let logoUrl: string | null = null;
      if (logo)
        logoUrl = (
          await storage.upload(
            `logos/partners/${partner.id}_${nanoid(7)}`,
            logo,
          )
        ).url;

      await prisma.partner.update({
        where: { id: partner.id },
        data: {
          name,
          bio: description,
          logo: logoUrl,
        },
      });

      return { ok: true };
    } catch (e) {
      console.error(e);
      return {
        ok: false,
      };
    }
  });
