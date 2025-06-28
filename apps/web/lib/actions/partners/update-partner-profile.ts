"use server";

import { qstash } from "@/lib/cron";
import { storage } from "@/lib/storage";
import { prisma } from "@dub/prisma";
import {
  APP_DOMAIN_WITH_NGROK,
  COUNTRIES,
  deepEqual,
  nanoid,
} from "@dub/utils";
import { PartnerProfileType } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { stripe } from "../../stripe";
import z from "../../zod";
import { uploadedImageSchema } from "../../zod/schemas/misc";
import { authPartnerActionClient } from "../safe-action";

const updatePartnerProfileSchema = z
  .object({
    name: z.string(),
    image: uploadedImageSchema.nullish(),
    description: z.string().nullable(),
    country: z.enum(Object.keys(COUNTRIES) as [string, ...string[]]).nullable(),
    profileType: z.nativeEnum(PartnerProfileType),
    companyName: z.string().nullable(),
  })
  .refine(
    (data) => {
      if (data.profileType === "company") {
        return !!data.companyName;
      }

      return true;
    },
    {
      message: "Legal company name is required.",
      path: ["companyName"],
    },
  )
  .transform((data) => ({
    ...data,
    companyName: data.profileType === "individual" ? null : data.companyName,
  }));

// Update a partner profile
export const updatePartnerProfileAction = authPartnerActionClient
  .schema(updatePartnerProfileSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { name, image, description, country, profileType, companyName } =
      parsedInput;

    const countryChanged =
      partner.country?.toLowerCase() !== country?.toLowerCase();

    const profileTypeChanged =
      partner.profileType.toLowerCase() !== profileType.toLowerCase();

    const companyNameChanged =
      partner.companyName?.toLowerCase() !== companyName?.toLowerCase();

    if (countryChanged || profileTypeChanged || companyNameChanged) {
      // Partner is only able to update their country, profile type, or company name
      // as long as they don't have any completed payouts
      const completedPayoutsCount = await prisma.payout.count({
        where: {
          partnerId: partner.id,
          status: "completed",
        },
      });

      if (completedPayoutsCount > 0) {
        throw new Error(
          "Since you've already received payouts on Dub, you cannot change your country or profile type. Please contact support to update those fields.",
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

    const updatedPartner = await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        name,
        description,
        ...(imageUrl && { image: imageUrl }),
        country,
        profileType,
        companyName,
      },
    });

    waitUntil(
      (async () => {
        const shouldExpireCache = !deepEqual(
          {
            name: partner.name,
            image: partner.image,
          },
          {
            name: updatedPartner.name,
            image: updatedPartner.image,
          },
        );

        if (!shouldExpireCache) {
          return;
        }

        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-partners`,
          body: {
            partnerId: partner.id,
          },
        });
      })(),
    );
  });
