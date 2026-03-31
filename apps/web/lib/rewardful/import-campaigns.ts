import { RESOURCE_COLORS } from "@/ui/colors";
import { prisma } from "@dub/prisma";
import { EventType, Prisma, RewardStructure } from "@dub/prisma/client";
import { randomValue } from "@dub/utils";
import { differenceInSeconds } from "date-fns";
import { createId } from "../api/create-id";
import { serializeReward } from "../api/partners/serialize-reward";
import { getRewardAmount } from "../partners/get-reward-amount";
import { stripeAppClient } from "../stripe";
import {
  DubDiscountAttributes,
  stripeCouponToDubDiscount,
  validateStripeCouponForDubDiscount,
} from "../stripe/coupon-discount-converter";
import { DEFAULT_PARTNER_GROUP } from "../zod/schemas/groups";
import { RewardfulApi } from "./api";
import { rewardfulImporter } from "./importer";
import { RewardfulImportPayload } from "./types";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { mode: "live" }),
});

export async function importCampaigns(payload: RewardfulImportPayload) {
  const { programId, campaignIds } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      workspace: {
        select: {
          stripeConnectId: true,
        },
      },
      groups: {
        where: {
          slug: DEFAULT_PARTNER_GROUP.slug,
        },
      },
    },
  });

  if (!program.domain || !program.url) {
    throw new Error("Program domain or URL is not set.");
  }

  const {
    logo,
    wordmark,
    brandColor,
    holdingPeriodDays,
    autoApprovePartnersEnabledAt,
    additionalLinks,
    maxPartnerLinks,
    linkStructure,
    applicationFormData,
    landerData,
  } = program.groups[0] ?? {};

  const { token } = await rewardfulImporter.getCredentials(program.workspaceId);

  const rewardfulApi = new RewardfulApi({ token });

  const campaigns = await rewardfulApi.listCampaigns();
  const campaignsToImport = campaigns.filter((campaign) =>
    campaignIds.includes(campaign.id),
  );

  for (const campaign of campaignsToImport) {
    const {
      id: campaignId,
      commission_amount_cents,
      minimum_payout_cents,
      commission_percent,
      max_commission_period_months,
      days_until_commissions_are_due,
      reward_type,
    } = campaign;

    const groupSlug = `rewardful-${campaignId}`;
    const createdGroup = await prisma.partnerGroup.upsert({
      where: {
        programId_slug: {
          programId,
          slug: groupSlug,
        },
      },
      create: {
        id: createId({ prefix: "grp_" }),
        programId,
        name: `(Rewardful) ${campaign.name}`,
        slug: groupSlug,
        color: randomValue(RESOURCE_COLORS),
        // Use default group settings for new groups
        logo,
        wordmark,
        brandColor,
        holdingPeriodDays,
        autoApprovePartnersEnabledAt,
        ...(additionalLinks && { additionalLinks }),
        ...(maxPartnerLinks && { maxPartnerLinks }),
        ...(linkStructure && { linkStructure }),
        ...(applicationFormData && { applicationFormData }),
        ...(landerData && { landerData }),
        // Create default link for the group
        partnerGroupDefaultLinks: {
          create: {
            id: createId({ prefix: "pgdl_" }),
            programId,
            domain: program.domain,
            url: program.url,
          },
        },
      },
      update: {},
    });

    console.log(
      `Upserted group ${createdGroup.name} (${createdGroup.id}) matching Rewardful campaign ${campaign.name} (${campaignId}).`,
    );

    const createdSecondsAgo = differenceInSeconds(
      new Date(),
      createdGroup.createdAt,
    );

    console.log(
      `This group was created ${createdSecondsAgo} seconds ago (most likely ${createdSecondsAgo < 10 ? "created" : "upserted"})`,
    );

    if (!createdGroup.saleRewardId) {
      const createdReward = await prisma.reward.create({
        data: {
          id: createId({ prefix: "rw_" }),
          programId,
          // connect the reward to the group
          salePartnerGroup: {
            connect: {
              id: createdGroup.id,
            },
          },
          event: EventType.sale,
          maxDuration: max_commission_period_months,
          type:
            reward_type === "amount"
              ? RewardStructure.flat
              : RewardStructure.percentage,
          ...(reward_type === "amount"
            ? {
                amountInCents: commission_amount_cents,
              }
            : {
                amountInPercentage: new Prisma.Decimal(commission_percent),
              }),
        },
      });

      console.log(
        `Created sale reward ${createdReward.id} with amount ${getRewardAmount(serializeReward(createdReward))} and type ${createdReward.type}`,
      );
    }

    // Note: Interestingly, Rewardful's API can sometimes return `stripe_coupon_id: null`
    // even when the campaign has a valid Stripe coupon. In these cases we'd need to manually recreate the discount on Dub.
    if (!createdGroup.discountId && campaign.stripe_coupon_id) {
      let dubDiscountAttrs: DubDiscountAttributes | undefined;

      if (program.workspace.stripeConnectId) {
        try {
          const stripeCoupon = await stripe.coupons.retrieve(
            campaign.stripe_coupon_id,
            {
              stripeAccount: program.workspace.stripeConnectId,
            },
          );

          // Validate the Stripe coupon can be converted to a Dub discount
          const validation = validateStripeCouponForDubDiscount(stripeCoupon);
          if (validation.isValid) {
            // Convert Stripe coupon to Dub discount attributes
            dubDiscountAttrs = stripeCouponToDubDiscount(stripeCoupon);
          } else {
            console.error(
              `Invalid Stripe coupon ${campaign.stripe_coupon_id}: ${validation.errors.join(", ")}`,
            );
          }
        } catch (error) {
          console.error(
            `Error retrieving Stripe coupon ${campaign.stripe_coupon_id}: ${error}`,
          );
        }
      }

      const createdDiscount = await prisma.discount.create({
        data: {
          id: createId({ prefix: "disc_" }),
          programId,
          amount: dubDiscountAttrs?.amount ?? 0,
          type: dubDiscountAttrs?.type ?? "percentage",
          maxDuration: dubDiscountAttrs?.maxDuration ?? null,
          couponId: campaign.stripe_coupon_id,
          // connect the discount to the group
          partnerGroup: {
            connect: {
              id: createdGroup.id,
            },
          },
        },
      });

      console.log(
        `Created discount ${createdDiscount.id} (${createdDiscount.couponId}) with amount ${createdDiscount.amount} and type ${createdDiscount.type}`,
      );
    }

    if (campaign.default) {
      await prisma.program.update({
        where: {
          id: programId,
        },
        data: {
          minPayoutAmount: minimum_payout_cents,
        },
      });
      console.log(
        `Updated program ${programId} with min payout amount ${minimum_payout_cents} and holding period days ${days_until_commissions_are_due}`,
      );
    }
  }

  return await rewardfulImporter.queue({
    ...payload,
    action: "import-partners",
  });
}
