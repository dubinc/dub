"use server";

import { createId } from "@/lib/api/utils";
import { userIsInBeta } from "@/lib/edge-config";
import { completeProgramApplications } from "@/lib/partners/complete-program-applications";
import { storage } from "@/lib/storage";
import { createConnectedAccount } from "@/lib/stripe/create-connected-account";
import { onboardPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
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
    const { name, email, image, country, description } = parsedInput;

    const partnersPortalEnabled = await userIsInBeta(
      user.email,
      "partnersPortal",
    );

    if (!partnersPortalEnabled) {
      throw new Error("Partners portal feature flag disabled.");
    }

    const existingPartner = await prisma.partner.findUnique({
      where: {
        email,
      },
    });

    if (existingPartner && existingPartner.email !== email) {
      throw new Error(
        `"${email}" is already in use by another partner. Please use a different email.`,
      );
    }

    const connectedAccount = CONNECT_SUPPORTED_COUNTRIES.includes(country)
      ? await createConnectedAccount({
          name,
          email,
          country,
        })
      : null;

    const partnerId = existingPartner
      ? existingPartner.id
      : createId({ prefix: "pn_" });

    const imageUrl = await storage
      .upload(`partners/${partnerId}/image_${nanoid(7)}`, image)
      .then(({ url }) => url);

    const payload = {
      name,
      email,
      country,
      bio: description,
      image: imageUrl,
      ...(connectedAccount && { stripeConnectId: connectedAccount.id }),
      users: {
        create: {
          userId: user.id,
          role: "owner" as const,
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
