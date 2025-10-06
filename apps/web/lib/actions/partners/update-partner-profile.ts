"use server";

import { confirmEmailChange } from "@/lib/auth/confirm-email-change";
import { qstash } from "@/lib/cron";
import { getPartnerDiscoveryRequirements } from "@/lib/partners/discoverability";
import { storage } from "@/lib/storage";
import {
  MAX_PARTNER_DESCRIPTION_LENGTH,
  PartnerProfileSchema,
} from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import {
  ACME_PROGRAM_ID,
  APP_DOMAIN_WITH_NGROK,
  COUNTRIES,
  deepEqual,
  nanoid,
  PARTNERS_DOMAIN,
} from "@dub/utils";
import { Partner, PartnerProfileType } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { stripe } from "../../stripe";
import z from "../../zod";
import { uploadedImageSchema } from "../../zod/schemas/misc";
import { authPartnerActionClient } from "../safe-action";

const updatePartnerProfileSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    image: uploadedImageSchema.nullish(),
    description: z.string().max(MAX_PARTNER_DESCRIPTION_LENGTH).nullish(),
    country: z.enum(Object.keys(COUNTRIES) as [string, ...string[]]).nullish(),
    profileType: z.nativeEnum(PartnerProfileType).optional(),
    companyName: z.string().nullish(),
    discoverable: z.boolean().optional(),
  })
  .merge(PartnerProfileSchema.partial())
  .transform((data) => ({
    ...data,
    companyName: data.profileType === "individual" ? null : data.companyName,
  }));

// Update a partner profile
export const updatePartnerProfileAction = authPartnerActionClient
  .schema(updatePartnerProfileSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
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
      discoverable,
    } = parsedInput;

    if (
      profileType === "company" &&
      (companyName === undefined ? !partner.companyName : !companyName)
    )
      throw new Error("Legal company name is required.");

    // Delete the Stripe Express account if needed
    await deleteStripeAccountIfRequired({
      partner,
      input: parsedInput,
    });

    let imageUrl: string | null = null;
    let needsEmailVerification = false;
    const emailChanged = newEmail !== undefined && partner.email !== newEmail;

    // Upload the new image
    if (image) {
      const path = `partners/${partner.id}/image_${nanoid(7)}`;
      const uploaded = await storage.upload(path, image);
      imageUrl = uploaded.url;
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
          country,
          profileType,
          companyName,
          monthlyTraffic,
          discoverableAt: discoverable
            ? new Date()
            : discoverable === false
              ? null
              : undefined,

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
        include: {
          industryInterests: true,
          salesChannels: true,
          programs: true,
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
            // double check that the partner is still eligible for discovery
            if (updatedPartner.discoverableAt) {
              const partnerDiscoveryRequirements =
                getPartnerDiscoveryRequirements({
                  partner: {
                    ...updatedPartner,
                    industryInterests: updatedPartner.industryInterests?.map(
                      (interest) => interest.industryInterest,
                    ),
                    salesChannels: updatedPartner.salesChannels?.map(
                      (channel) => channel.salesChannel,
                    ),
                  },
                  totalCommissions: updatedPartner.programs
                    .filter((program) => program.programId !== ACME_PROGRAM_ID)
                    .reduce(
                      (acc, program) => acc + program.totalCommissions,
                      0,
                    ),
                });

              if (
                !partnerDiscoveryRequirements.every(
                  (requirement) => requirement.completed,
                )
              ) {
                console.log(
                  `Partner ${partner.id} is no longer eligible for discovery due to missing requirements: ${partnerDiscoveryRequirements
                    .filter((requirement) => !requirement.completed)
                    .map((requirement) => requirement.label)
                    .join(", ")}`,
                );
                await prisma.partner.update({
                  where: {
                    id: partner.id,
                  },
                  data: {
                    discoverableAt: null,
                  },
                });
              }
            }

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

const deleteStripeAccountIfRequired = async ({
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

  const companyNameChanged =
    input.profileType === "company" &&
    partner.companyName?.toLowerCase() !== input.companyName?.toLowerCase();

  const deleteExpressAccount =
    (countryChanged || profileTypeChanged || companyNameChanged) &&
    partner.stripeConnectId;

  if (!deleteExpressAccount) {
    return;
  }

  // Partner is not able to update their country, profile type, or company name
  // if they have already have a Stripe Express account + any sent / completed payouts
  const completedPayoutsCount = await prisma.payout.count({
    where: {
      partnerId: partner.id,
      status: {
        in: ["sent", "completed"],
      },
    },
  });

  if (completedPayoutsCount > 0) {
    throw new Error(
      "Since you've already received payouts on Dub, you cannot change your country or profile type. Please contact support to update those fields.",
    );
  }

  if (partner.stripeConnectId) {
    const response = await stripe.accounts.del(partner.stripeConnectId);

    if (response.deleted) {
      await prisma.partner.update({
        where: {
          id: partner.id,
        },
        data: {
          stripeConnectId: null,
          payoutsEnabledAt: null,
        },
      });
    }
  }
};
