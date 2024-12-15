"use server";

import { createId } from "@/lib/api/utils";
import { userIsInBeta } from "@/lib/edge-config";
import { completeProgramApplications } from "@/lib/partners/complete-program-applications";
import { storage } from "@/lib/storage";
import { createConnectedAccount } from "@/lib/stripe/create-connected-account";
import { onboardPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { COUNTRIES, nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { authUserActionClient } from "../safe-action";

// Onboard a new partner
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

    if (!COUNTRIES[country]) {
      throw new Error("Invalid country code.");
    }

    // Create the Stripe connected account for the partner
    const connectedAccount = await createConnectedAccount({
      name,
      email,
      country,
    });

    const partnerId = createId({ prefix: "pn_" });

    const imageUrl = await storage
      .upload(`partners/${partnerId}/image_${nanoid(7)}`, image)
      .then(({ url }) => url);

    await Promise.all([
      prisma.partner.create({
        data: {
          id: partnerId,
          name,
          email,
          country,
          bio: description,
          stripeConnectId: connectedAccount.id,
          image: imageUrl,
          users: {
            create: {
              userId: user.id,
              role: "owner",
            },
          },
        },
      }),

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
