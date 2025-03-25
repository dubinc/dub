"use server";

import { storage } from "@/lib/storage";
import { prisma } from "@dub/prisma";
import { COUNTRIES, nanoid } from "@dub/utils";
import { stripe } from "../../stripe";
import z from "../../zod";
import { authPartnerActionClient } from "../safe-action";

const updatePartnerProfileSchema = z.object({
  name: z.string(),
  image: z.string().nullable(),
  description: z.string().nullable(),
  country: z.enum(Object.keys(COUNTRIES) as [string, ...string[]]).nullable(),
});

// Update a partner profile
export const updatePartnerProfileAction = authPartnerActionClient
  .schema(updatePartnerProfileSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { name, image, description, country } = parsedInput;

    if (
      partner.country &&
      partner.country.toLowerCase() !== country?.toLowerCase()
    ) {
      // Partner should be able to update their country if they don't have any sent payouts
      const sentPayoutsCount = await prisma.payout.count({
        where: {
          partnerId: partner.id,
          status: {
            in: ["processing", "completed"],
          },
        },
      });

      if (sentPayoutsCount > 0) {
        throw new Error(
          "Since you've already received payouts on Dub, you cannot change your country. If you need to update your country, please contact support.",
        );
      }

      if (partner.stripeConnectId) {
        const response = await stripe.accounts.del(partner.stripeConnectId);

        if (response.deleted) {
          await prisma.partner.update({
            where: {
              id: partner.id,
            },
            data: {
              stripeConnectId: null,
              payoutsEnabledAt: null,
            },
          });
        }
      }
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
      where: {
        id: partner.id,
      },
      data: {
        name,
        description,
        image: imageUrl,
        country,
      },
    });
  });
