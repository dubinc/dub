"use server";

import { confirmEmailChange } from "@/lib/auth/confirm-email-change";
import { throwIfNoPermission } from "@/lib/auth/partner-users/throw-if-no-permission";
import { qstash } from "@/lib/cron";
import { isReservedUsername } from "@/lib/edge-config";
import { storage } from "@/lib/storage";
import { stripe } from "@/lib/stripe";
import { partnerProfileChangeHistoryLogSchema } from "@/lib/zod/schemas/partner-profile";
import {
  MAX_PARTNER_DESCRIPTION_LENGTH,
  PartnerProfileDetailsSchema,
} from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Partner, PartnerProfileType } from "@dub/prisma/client";
import {
  APP_DOMAIN_WITH_NGROK,
  COUNTRIES,
  deepEqual,
  nanoid,
  PARTNERS_DOMAIN,
  RESERVED_SLUGS,
  validSlugRegex,
} from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { uploadedImageSchema } from "../../zod/schemas/images";
import { authPartnerActionClient } from "../safe-action";

const updatePartnerProfileSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").optional(),
    email: z.email().optional(),
    username: z.string().trim().toLowerCase().min(3).max(100).optional(),
    image: uploadedImageSchema.nullish(),
    description: z.string().max(MAX_PARTNER_DESCRIPTION_LENGTH).nullish(),
    country: z.enum(Object.keys(COUNTRIES) as [string, ...string[]]).nullish(),
    profileType: z.enum(PartnerProfileType).optional(),
    companyName: z.string().nullish(),
  })
  .extend(PartnerProfileDetailsSchema.partial().shape)
  .transform((data) => ({
    ...data,
    companyName: data.profileType === "individual" ? null : data.companyName,
  }))
  .refine(
    (data) => {
      if (data.profileType === "company") {
        return !!data.companyName;
      }

      return true;
    },
    {
      message: "Legal company name is required when profile type is 'company'.",
      path: ["companyName"],
    },
  );

// Update a partner profile
export const updatePartnerProfileAction = authPartnerActionClient
  .inputSchema(updatePartnerProfileSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner, partnerUser } = ctx;

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "partner_profile.update",
    });

    const {
      name,
      email: newEmail,
      image,
      description,
      country,
      profileType,
      companyName,
      monthlyTraffic,
      industryInterests,
      preferredEarningStructures,
      salesChannels,
      username,
    } = parsedInput;

    await updatedComplianceFieldsChecks({
      partner,
      input: parsedInput,
    });

    let imageUrl: string | null = null;
    let needsEmailVerification = false;
    const emailChanged = newEmail !== undefined && partner.email !== newEmail;

    // Upload the new image
    if (image) {
      const uploaded = await storage.upload({
        key: `partners/${partner.id}/image_${nanoid(7)}`,
        body: image,
      });
      imageUrl = uploaded.url;
    }

    if (username && username !== partner.username) {
      if (!validSlugRegex.test(username) || RESERVED_SLUGS.includes(username)) {
        throw new Error("Invalid username");
      }
      if (await isReservedUsername(username)) {
        throw new Error("Invalid username");
      }
      const existingPartner = await prisma.partner.findUnique({
        where: {
          username,
        },
        select: {
          id: true,
        },
      });

      if (existingPartner && existingPartner.id !== partner.id) {
        throw new Error(`Username "${username}" is already taken.`);
      }
    }

    try {
      const updatedPartner = await prisma.partner.update({
        where: {
          id: partner.id,
        },
        data: {
          name,
          description,
          ...(imageUrl && { image: imageUrl }),
          username,
          country,
          profileType,
          companyName,
          monthlyTraffic,
          ...(industryInterests && {
            industryInterests: {
              deleteMany: {},
              create: industryInterests.map((name) => ({
                industryInterest: name,
              })),
            },
          }),

          ...(preferredEarningStructures && {
            preferredEarningStructures: {
              deleteMany: {},
              create: preferredEarningStructures.map((name) => ({
                preferredEarningStructure: name,
              })),
            },
          }),

          ...(salesChannels && {
            salesChannels: {
              deleteMany: {},
              create: salesChannels.map((name) => ({
                salesChannel: name,
              })),
            },
          }),
        },
      });

      // If the email is being changed, we need to verify the new email address
      if (emailChanged) {
        const partnerWithEmail = await prisma.partner.findUnique({
          where: {
            email: newEmail,
          },
        });

        if (partnerWithEmail) {
          throw new Error(
            `Email ${newEmail} is already in use. Do you want to merge your partner accounts instead? (https://d.to/merge-partners)`,
          );
        }

        await confirmEmailChange({
          email: partner.email!,
          newEmail,
          identifier: partner.id,
          isPartnerProfile: true,
          hostName: PARTNERS_DOMAIN,
        });

        needsEmailVerification = true;
      }

      waitUntil(
        Promise.allSettled([
          (async () => {
            const shouldExpireCache = !deepEqual(
              {
                name: partner.name,
                image: partner.image,
              },
              {
                name: updatedPartner.name,
                image: updatedPartner.image,
              },
            );

            if (!shouldExpireCache) {
              return;
            }

            await qstash.publishJSON({
              url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-partners`,
              body: {
                partnerId: partner.id,
              },
            });
          })(),
        ]),
      );

      return {
        needsEmailVerification,
      };
    } catch (error) {
      console.error(error);

      throw new Error(error.message);
    }
  });

const updatedComplianceFieldsChecks = async ({
  partner,
  input,
}: {
  partner: Partner;
  input: z.infer<typeof updatePartnerProfileSchema>;
}) => {
  const countryChanged =
    input.country !== undefined &&
    partner.country?.toLowerCase() !== input.country?.toLowerCase();

  const profileTypeChanged =
    input.profileType !== undefined &&
    partner.profileType.toLowerCase() !== input.profileType.toLowerCase();

  if (!countryChanged && !profileTypeChanged) {
    return;
  }

  if (partner.payoutsEnabledAt) {
    throw new Error(
      "Since you've already connected your bank account for payouts, you cannot change your country or profile type. Please contact support to update those fields.",
    );
  }

  const partnerChangeHistoryLog = partner.changeHistoryLog
    ? partnerProfileChangeHistoryLogSchema.parse(partner.changeHistoryLog)
    : [];

  if (countryChanged) {
    partnerChangeHistoryLog.push({
      field: "country",
      from: partner.country as string,
      to: input.country as string,
      changedAt: new Date(),
    });

    // if there was an existing veriff session, trigger a country change verification
    if (partner.veriffSessionId) {
      waitUntil(
        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partners/verify-country-change`,
          body: {
            partnerId: partner.id,
          },
        }),
      );
    }
  }

  if (profileTypeChanged) {
    partnerChangeHistoryLog.push({
      field: "profileType",
      from: partner.profileType,
      to: input.profileType as PartnerProfileType,
      changedAt: new Date(),
    });
  }

  if (partner.stripeConnectId) {
    await stripe.accounts.del(partner.stripeConnectId);
  }

  await prisma.partner.update({
    where: {
      id: partner.id,
    },
    data: {
      stripeConnectId: null,
      changeHistoryLog: partnerChangeHistoryLog,
    },
  });
};
