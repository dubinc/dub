"use server";

import { trackSale } from "@/lib/api/conversions/track-sale";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getReferralOrThrow } from "@/lib/api/referrals/get-referral-or-throw";
import { markReferralClosedWonSchema } from "@/lib/zod/schemas/referrals";
import { prisma } from "@dub/prisma";
import { ReferralStatus } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

// Mark a partner referral as closed won
export const markReferralClosedWonAction = authActionClient
  .inputSchema(markReferralClosedWonSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { referralId, saleAmount, stripeCustomerId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const referral = await getReferralOrThrow({
      referralId,
      programId,
    });

    if (referral.status === ReferralStatus.closedWon) {
      throw new DubApiError({
        code: "bad_request",
        message: "This partner referral is already marked as closed won.",
      });
    }

    if (!referral.customer) {
      throw new DubApiError({
        code: "bad_request",
        message: "This referral does not have a customer associated with it.",
      });
    }

    // Mark the referral as closed won
    await prisma.partnerReferral.update({
      where: {
        id: referralId,
        status: "qualified",
      },
      data: {
        status: ReferralStatus.closedWon,
      },
    });

    await trackSale({
      customerExternalId: referral.customer.externalId!,
      amount: saleAmount,
      eventName: "Closed Won",
      paymentProcessor: "custom",
      invoiceId: null,
      metadata: null,
      rawBody: {},
      workspace,
      source: "submitted",
    });

    // Update customer with the stripe customer ID
    waitUntil(
      prisma.customer.update({
        where: {
          id: referral.customerId!,
        },
        data: {
          stripeCustomerId,
        },
      }),
    );
  });
