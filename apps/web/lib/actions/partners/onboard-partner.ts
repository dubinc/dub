"use server";

import { createId } from "@/lib/api/create-id";
import { isCI, isLocalDev } from "@/lib/api/environment";
import { generatePartnerUsername } from "@/lib/api/partners/generate-partner-username";
import { markApplicationEventSubmittedNetwork } from "@/lib/application-events/mark-application-event-submitted-network";
import { completeProgramApplications } from "@/lib/partners/complete-program-applications";
import { storage } from "@/lib/storage";
import { onboardPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { headers } from "next/headers";
import { authUserActionClient } from "../safe-action";

// Onboard a new partner:
// - If the Partner already exists and matches the user's email, update the Partner
// - If the Partner doesn't exist, create it
export const onboardPartnerAction = authUserActionClient
  .inputSchema(onboardPartnerSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;
    const { name, image, description, profileType, companyName } = parsedInput;

    const existingPartner = await prisma.partner.findUnique({
      where: {
        email: user.email,
      },
      select: {
        id: true,
        username: true,
        country: true,
        profileType: true,
        companyName: true,
      },
    });

    const partnerId = existingPartner
      ? existingPartner.id
      : createId({ prefix: "pn_" });

    const imageUrl = image
      ? await storage
          .upload({
            key: `partners/${partnerId}/image_${nanoid(7)}`,
            body: image,
          })
          .then(({ url }) => url)
      : undefined;

    const username = existingPartner?.username
      ? undefined
      : await generatePartnerUsername({
          name,
          email: user.email,
        });

    const headerList = await headers();
    const country =
      headerList.get("x-vercel-ip-country") ??
      (isLocalDev || isCI ? "US" : undefined);

    const payload: Prisma.PartnerCreateInput = {
      name: name || user.email,
      email: user.email,
      ...(username && { username }),
      // can only update these fields if it's not already set (else you need to update under profile settings)
      ...(existingPartner?.country ? {} : { country }),
      ...(existingPartner?.profileType ? {} : { profileType }),
      ...(existingPartner?.companyName ? {} : { companyName }),
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
            notificationPreferences: {
              create: {},
            },
          },
        },
      },
    };

    const [updatedPartner] = await Promise.all([
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

    waitUntil(
      Promise.allSettled([
        // Complete any outstanding program application
        completeProgramApplications(user.email),

        // Mark the application event as submitted for the `network` program
        markApplicationEventSubmittedNetwork(updatedPartner),
      ]),
    );

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
