"use server";

import { createId } from "@/lib/api/create-id";
import { completeProgramApplications } from "@/lib/partners/complete-program-applications";
import { stripe } from "@/lib/stripe";
import { storage } from "@/lib/storage";
import { partnerProfileChangeHistoryLogSchema } from "@/lib/zod/schemas/partner-profile";
import { onboardPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { authUserActionClient } from "../safe-action";

// Onboard a new partner:
// - If the Partner already exists and matches the user's email, update the Partner
// - If the Partner doesn't exist, create it
export const onboardPartnerAction = authUserActionClient
  .inputSchema(onboardPartnerSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;
    const { name, image, country, description, profileType } = parsedInput;

    const existingPartner = await prisma.partner.findUnique({
      where: {
        email: user.email,
      },
    });

    const partnerId = existingPartner
      ? existingPartner.id
      : createId({ prefix: "pn_" });

    const countryChanged =
      !!existingPartner?.country &&
      existingPartner.country.toLowerCase() !== country.toLowerCase();

    if (countryChanged && existingPartner?.payoutsEnabledAt) {
      throw new Error(
        "Since you've already connected your bank account for payouts, you cannot change your country. Please contact support to update this field.",
      );
    }

    const stripeConnectIdToDelete =
      countryChanged && existingPartner?.stripeConnectId
        ? existingPartner.stripeConnectId
        : null;

    const imageUrl = image
      ? await storage
          .upload({
            key: `partners/${partnerId}/image_${nanoid(7)}`,
            body: image,
          })
          .then(({ url }) => url)
      : undefined;

    const partnerChangeHistoryLog = existingPartner?.changeHistoryLog
      ? partnerProfileChangeHistoryLogSchema.parse(existingPartner.changeHistoryLog)
      : [];

    if (countryChanged) {
      partnerChangeHistoryLog.push({
        field: "country",
        from: existingPartner.country as string,
        to: country,
        changedAt: new Date(),
      });
    }

    const payload = {
      name: name || user.email,
      email: user.email,
      // country can be updated until payouts are enabled
      ...(!existingPartner?.country || !existingPartner?.payoutsEnabledAt
        ? { country }
        : {}),
      ...(existingPartner?.profileType ? {} : { profileType }),
      ...(description && { description }),
      image: imageUrl,
      ...(countryChanged
        ? {
            stripeConnectId: null,
            changeHistoryLog: partnerChangeHistoryLog,
          }
        : {}),
      users: {
        connectOrCreate: {
          where: {
            userId_partnerId: {
              userId: user.id,
              partnerId: partnerId,
            },
          },
          create: {
            userId: user.id,
            role: "owner",
            notificationPreferences: {
              create: {},
            },
          },
        },
      },
    };

    const createPayload = payload as Prisma.PartnerCreateInput;
    const updatePayload = payload as Prisma.PartnerUpdateInput;

    await Promise.all([
      existingPartner
        ? prisma.partner.update({
            where: {
              id: existingPartner.id,
            },
            data: updatePayload,
          })
        : prisma.partner.create({
            data: {
              id: partnerId,
              ...createPayload,
            },
          }),

      // if the user doesn't have a default partner id, set the new partner id as the user's default partner id
      !user.defaultPartnerId &&
        prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            defaultPartnerId: partnerId,
          },
        }),
    ]);

    if (stripeConnectIdToDelete) {
      waitUntil(
        stripe.accounts.del(stripeConnectIdToDelete).catch((error) => {
          if (error?.code === "account_invalid") {
            return;
          }

          console.error(
            "Failed to delete Stripe account after country update",
            error,
          );
        }),
      );
    }

    // Complete any outstanding program application
    waitUntil(completeProgramApplications(user.email));

    // if the user doesn't have an image, set the uploaded image as the user's image
    if (!user.image && image) {
      waitUntil(
        storage
          .upload({
            key: `avatars/${user.id}`,
            body: image,
          })
          .then(({ url }) => {
            prisma.user.update({
              where: {
                id: user.id,
              },
              data: { image: url },
            });
          }),
      );
    }
  });
