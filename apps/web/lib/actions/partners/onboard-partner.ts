"use server";

import { createId } from "@/lib/api/utils";
import { createDotsUser } from "@/lib/dots/create-dots-user";
import { userIsInBeta } from "@/lib/edge-config";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { COUNTRIES } from "@dub/utils";
import { nanoid } from "nanoid";
import z from "../../zod";
import { authUserActionClient } from "../safe-action";

const onboardPartnerSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  country: z.enum(Object.keys(COUNTRIES) as [string, ...string[]]),
  phoneNumber: z.string().trim().min(1).max(15),
  logo: z.string().nullable(),
  description: z.string().max(5000).nullable(),
});

// Onboard a new partner
export const onboardPartner = authUserActionClient
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

    const { firstName, lastName, country, phoneNumber, logo, description } =
      parsedInput;

    try {
      const partner = await prisma.partner.create({
        data: {
          name: `${firstName} ${lastName}`,
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

      // TODO: Handle case where a partner can be invited to multiple programs

      // If the partner has invites, we need to enroll them in the program and delete the invites
      const programInvite = await prisma.programInvite.findFirst({
        where: { email: user.email },
      });

      if (programInvite) {
        const { id, programId, linkId } = programInvite;

        await prisma.programEnrollment.create({
          data: {
            programId,
            linkId,
            partnerId: partner.id,
            status: "approved",
          },
        });

        await prisma.programInvite.delete({
          where: { id },
        });

        const program = await prisma.program.findUnique({
          where: { id: programId },
          select: {
            workspace: {
              select: {
                dotsAppId: true,
              },
            },
          },
        });

        if (program?.workspace?.dotsAppId) {
          await createDotsUser({
            dotsAppId: program.workspace.dotsAppId,
            userInfo: {
              firstName,
              lastName,
              email: user.email,
              countryCode: country, // TODO: Should be country code (e.g. US -> +1)
              phoneNumber,
            },
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
