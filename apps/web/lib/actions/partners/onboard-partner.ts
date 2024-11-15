"use server";

import { createId } from "@/lib/api/utils";
import { createDotsUser } from "@/lib/dots/create-dots-user";
import { userIsInBeta } from "@/lib/edge-config";
import { completeProgramApplications } from "@/lib/partners/complete-program-applications";
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
      const partner = await prisma.partner.create({
        data: {
          name,
          country,
          bio: description,
          id: createId({ prefix: "pn_" }),
          users: {
            create: {
              userId: user.id,
              role: "owner",
            },
          },
        },
      });

      if (logo) {
        const { url } = await storage.upload(
          `logos/partners/${partner.id}_${nanoid(7)}`,
          logo,
        );

        await prisma.partner.update({
          where: { id: partner.id },
          data: { logo: url },
        });
      }

      const programInvite = await prisma.programInvite.findFirst({
        where: { email: user.email },
      });

      // If the partner has invites, we need to enroll them in the program and delete the invites
      if (programInvite) {
        await prisma.programEnrollment.create({
          data: {
            id: createId({ prefix: "pge_" }),
            programId: programInvite.programId,
            linkId: programInvite.linkId,
            partnerId: partner.id,
            status: "approved",
          },
        });

        await prisma.programInvite.delete({
          where: { id: programInvite.id },
        });
      }

      // Complete any outstanding program applications
      await completeProgramApplications(user.id);

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

      await createDotsUser({
        userInfo: dotsUserInfo,
      });

      // Create the Dots user with the program's DOTS_APP_ID
      if (programInvite) {
        const program = await prisma.program.findUniqueOrThrow({
          where: { id: programInvite.programId },
          select: {
            workspace: {
              select: {
                dotsAppId: true,
              },
            },
          },
        });

        if (program.workspace.dotsAppId) {
          await createDotsUser({
            dotsAppId: program.workspace.dotsAppId,
            userInfo: dotsUserInfo,
          });
        }
      }

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
