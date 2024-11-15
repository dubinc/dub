"use server";

import { createId } from "@/lib/api/utils";
import { createDotsUser } from "@/lib/dots/create-dots-user";
import { userIsInBeta } from "@/lib/edge-config";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { onboardPartnerSchema } from "@/lib/zod/schemas/partners";
import { COUNTRY_PHONE_CODES } from "@dub/utils";
import { nanoid } from "nanoid";
import { authUserActionClient } from "../safe-action";

// Onboard a new partner
export const onboardPartnerAction = authUserActionClient
  .schema(onboardPartnerSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;

    const partnersPortalEnabled = await userIsInBeta(
      user.email,
      "partnersPortal",
    );

    if (!partnersPortalEnabled) {
      return {
        ok: false,
        error: "Partners portal feature flag disabled.",
      };
    }

    const { name, logo, country, phoneNumber, description } = parsedInput;

    try {
      // Create the Dots user with DOTS_DEFAULT_APP_ID
      const [firstName, lastName] = name.split(" ");
      const countryCode = COUNTRY_PHONE_CODES[country];

      if (!countryCode) {
        throw new Error("Invalid country code.");
      }

      const dotsUserInfo = {
        firstName,
        lastName: lastName || firstName.slice(0, 1), // Dots requires a last name
        email: user.email,
        countryCode: countryCode.toString(),
        phoneNumber,
      };

      const dotsUser = await createDotsUser({
        userInfo: dotsUserInfo,
      });

      const partnerId = createId({ prefix: "pn_" });

      const logoUrl = logo
        ? await storage
            .upload(`logos/partners/${partnerId}_${nanoid(7)}`, logo)
            .then(({ url }) => url)
        : null;

      const partner = await prisma.partner.create({
        data: {
          id: partnerId,
          name,
          country,
          bio: description,
          dotsUserId: dotsUser.id,
          logo: logoUrl,
          users: {
            create: {
              userId: user.id,
              role: "owner",
            },
          },
        },
      });

      return {
        ok: true,
        partnerId: partner.id,
      };
    } catch (e) {
      console.error(e);
      return {
        ok: false,
      };
    }
  });
