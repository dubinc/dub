"use server";

import { userIsInBeta } from "@/lib/edge-config";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { nanoid } from "@dub/utils";
import z from "../../zod";
import { authPartnerActionClient } from "../safe-action";

const updatePartnerProfileSchema = z.object({
  partnerId: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  description: z.string().nullable(),
});

// Update a partner profile
export const updatePartnerProfileAction = authPartnerActionClient
  .schema(updatePartnerProfileSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { user, partner } = ctx;
    const { name, image, description } = parsedInput;

    const partnersPortalEnabled = await userIsInBeta(
      user.email,
      "partnersPortal",
    );

    if (!partnersPortalEnabled) {
      throw new Error("Partners portal feature flag disabled.");
    }

    const imageUrl = image
      ? (
          await storage.upload(
            `partners/${partner.id}/image_${nanoid(7)}`,
            image,
          )
        ).url
      : null;

    await prisma.partner.update({
      where: { id: partner.id },
      data: {
        name,
        bio: description,
        image: imageUrl,
      },
    });
  });
