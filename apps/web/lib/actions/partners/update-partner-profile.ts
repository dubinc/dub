"use server";

import { DubApiError } from "@/lib/api/errors";
import { confirmEmailChange } from "@/lib/auth/confirm-email-change";
import { throwIfNoPermission } from "@/lib/auth/partner-users/throw-if-no-permission";
import { qstash } from "@/lib/cron";
import { isReservedUsername } from "@/lib/edge-config";
import { storage } from "@/lib/storage";
import { ratelimit } from "@/lib/upstash";
import { partnerProfileChangeHistoryLogSchema } from "@/lib/zod/schemas/partner-profile";
import {
  MAX_PARTNER_DESCRIPTION_LENGTH,
  PartnerProfileDetailsSchema,
} from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Partner, PartnerProfileType } from "@dub/prisma/client";
import {
  APP_DOMAIN_WITH_NGROK,
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
      const { success } = await ratelimit(5, "1 h").limit(
        `partner-profile:username-update:${partner.id}`,
      );

      if (!success) {
        throw new DubApiError({
          code: "rate_limit_exceeded",
          message:
            "You've updated your username too many times. Please try again later.",
        });
      }

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
  const profileTypeChanged =
    input.profileType !== undefined &&
    partner.profileType.toLowerCase() !== input.profileType.toLowerCase();

  if (!profileTypeChanged) {
    return;
  }

  const partnerChangeHistoryLog = partner.changeHistoryLog
    ? partnerProfileChangeHistoryLogSchema.parse(partner.changeHistoryLog)
    : [];

  if (profileTypeChanged) {
    partnerChangeHistoryLog.push({
      field: "profileType",
      from: partner.profileType,
      to: input.profileType as PartnerProfileType,
      changedAt: new Date(),
    });
  }

  await prisma.partner.update({
    where: {
      id: partner.id,
    },
    data: {
      changeHistoryLog: partnerChangeHistoryLog,
    },
  });
};
