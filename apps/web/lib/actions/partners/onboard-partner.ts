"use server";

import { createId } from "@/lib/api/create-id";
import { completeProgramApplications } from "@/lib/partners/complete-program-applications";
import { storage } from "@/lib/storage";
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
  .schema(onboardPartnerSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;
    const { name, image, country, description, profileType, companyName } =
      parsedInput;

    const existingPartner = await prisma.partner.findUnique({
      where: {
        email: user.email,
      },
    });

    const partnerId = existingPartner
      ? existingPartner.id
      : createId({ prefix: "pn_" });

    const imageUrl = await storage
      .upload(`partners/${partnerId}/image_${nanoid(7)}`, image)
      .then(({ url }) => url);

    // country, profileType, and companyName cannot be changed once set
    const payload: Prisma.PartnerCreateInput = {
      name,
      email: user.email,
      // you can only update these fields if the partner doesn't already have a stripeConnectId
      ...(existingPartner?.stripeConnectId
        ? {}
        : {
            country,
            profileType,
            companyName,
          }),
      ...(description && { description }),
      image: imageUrl,
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
