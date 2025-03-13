"use server";

import { createId } from "@/lib/api/create-id";
import { completeProgramApplications } from "@/lib/partners/complete-program-applications";
import { storage } from "@/lib/storage";
import { createConnectedAccount } from "@/lib/stripe/create-connected-account";
import { onboardPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { CONNECT_SUPPORTED_COUNTRIES, nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { authUserActionClient } from "../safe-action";

// Onboard a new partner:
// - If the Partner already exists and matches the user's email, update the Partner (ghost partner)
// - If the Partner doesn't exist, create it
export const onboardPartnerAction = authUserActionClient
  .schema(onboardPartnerSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;
    const { name, image, country, description, businessType, companyName } =
      parsedInput;

    const existingPartner = await prisma.partner.findUnique({
      where: {
        email: user.email,
      },
    });

    // only create a connected account if the partner doesn't already have one
    // and the country is supported
    const connectedAccount =
      !existingPartner?.stripeConnectId &&
      CONNECT_SUPPORTED_COUNTRIES.includes(country)
        ? await createConnectedAccount({
            name,
            email: user.email,
            country,
          })
        : null;

    const partnerId = existingPartner
      ? existingPartner.id
      : createId({ prefix: "pn_" });

    const imageUrl = await storage
      .upload(`partners/${partnerId}/image_${nanoid(7)}`, image)
      .then(({ url }) => url);

    // country, businessType, and companyName cannot be changed once set
    const payload: Prisma.PartnerCreateInput = {
      name,
      email: user.email,
      country: existingPartner?.country || country,
      businessType: existingPartner?.businessType || businessType,
      companyName: existingPartner?.companyName || companyName,
      ...(description && { description }),
      image: imageUrl,
      ...(connectedAccount && { stripeConnectId: connectedAccount.id }),
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
          },
        },
      },
    };

    await Promise.all([
      existingPartner
        ? prisma.partner.update({
            where: {
              id: existingPartner.id,
            },
            data: payload,
          })
        : prisma.partner.create({
            data: {
              id: partnerId,
              ...payload,
            },
          }),

      // only set the default partner ID if the user doesn't already have one
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

    // Complete any outstanding program applications
    waitUntil(completeProgramApplications(user.id));
  });
