"use server";

import { getPartnerOrThrow } from "@/lib/api/partners/get-partner-or-throw";
import { userIsInBeta } from "@/lib/edge-config";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { nanoid } from "@dub/utils";
import z from "../../zod";
import { authUserActionClient } from "../safe-action";

const updatePartnerProfileSchema = z.object({
  partnerId: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  description: z.string().nullable(),
});

// Update a partner profile
export const updatePartnerProfile = authUserActionClient
  .schema(updatePartnerProfileSchema)
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

    const { name, image, description } = parsedInput;

    try {
      let imageUrl: string | null = null;
      if (image)
        imageUrl = (
          await storage.upload(
            `partners/${partner.id}/image_${nanoid(7)}`,
            image,
          )
        ).url;

      await prisma.partner.update({
        where: { id: partner.id },
        data: {
          name,
          bio: description,
          image: imageUrl,
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
