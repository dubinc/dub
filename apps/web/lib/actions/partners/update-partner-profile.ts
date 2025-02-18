"use server";

import { storage } from "@/lib/storage";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import z from "../../zod";
import { authPartnerActionClient } from "../safe-action";

const updatePartnerProfileSchema = z.object({
  name: z.string(),
  image: z.string().nullable(),
  description: z.string().nullable(),
});

// Update a partner profile
export const updatePartnerProfileAction = authPartnerActionClient
  .schema(updatePartnerProfileSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { name, image, description } = parsedInput;

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
        description,
        image: imageUrl,
      },
    });
  });
