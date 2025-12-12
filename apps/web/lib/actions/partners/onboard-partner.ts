"use server";

import { createId } from "@/lib/api/create-id";
import { completeProgramApplications } from "@/lib/partners/complete-program-applications";
import { storage } from "@/lib/storage";
import { onboardPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { nanoid, OG_AVATAR_URL, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { authUserActionClient } from "../safe-action";

// Onboard a new partner:
// - If the Partner already exists and matches the user's email, update the Partner
// - If the Partner doesn't exist, create it
export const onboardPartnerAction = authUserActionClient
  .schema(onboardPartnerSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;
    const { name, image, country, description, profileType } = parsedInput;

    const [existingPartner, userHasProjects] = await Promise.all([
      prisma.partner.findUnique({
        where: {
          email: user.email,
        },
      }),
      // Check if user has any workspaces (dub account)
      prisma.projectUsers.findFirst({
        where: {
          userId: user.id,
        },
        select: { id: true },
      }),
    ]);

    const partnerId = existingPartner
      ? existingPartner.id
      : createId({ prefix: "pn_" });

    // Determine if we should sync the partner image to the user account
    // Only sync on partner creation (not update) and only if user has no dub account (no projects)
    // Also don't overwrite if user already has a custom image (stored in R2, not a default avatar)
    const isNewPartner = !existingPartner;
    const userHasCustomImage = user.image?.startsWith(R2_URL);
    const shouldSyncImageToUser =
      isNewPartner && !userHasProjects && !userHasCustomImage;

    // Use uploaded image or generate default avatar URL
    const imageUrl = image
      ? await storage
          .upload({
            key: `partners/${partnerId}/image_${nanoid(7)}`,
            body: image,
          })
          .then(({ url }) => url)
      : `${OG_AVATAR_URL}${name || user.email}`;

    // country, profileType, and companyName cannot be changed once set
    const payload: Prisma.PartnerCreateInput = {
      name: name || user.email,
      email: user.email,
      // can only update these fields if it's not already set (else you need to update under profile settings)
      ...(existingPartner?.country ? {} : { country }),
      ...(existingPartner?.profileType ? {} : { profileType }),
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
      // also sync the partner image to user account if creating a new partner and user has no dub account
      (!user.defaultPartnerId || shouldSyncImageToUser) &&
        prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            ...(!user.defaultPartnerId && { defaultPartnerId: partnerId }),
            ...(shouldSyncImageToUser && { image: imageUrl }),
          },
        }),
    ]);

    // Complete any outstanding program application
    waitUntil(completeProgramApplications(user.email));
  });
