"use server";

import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getReferralOrThrow } from "@/lib/api/referrals/get-referral-or-throw";
import { markReferralClosedWonSchema } from "@/lib/zod/schemas/referrals";
import { prisma } from "@dub/prisma";
import { ReferralStatus } from "@dub/prisma/client";
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

    if (!referral.customerId) {
      throw new DubApiError({
        code: "bad_request",
        message: "This referral does not have a customer associated with it.",
      });
    }

    if (referral.status === ReferralStatus.closedWon) {
      throw new DubApiError({
        code: "bad_request",
        message: "This partner referral is already marked as closed won.",
      });
    }

    await prisma.partnerReferral.update({
      where: {
        id: referralId,
        status: "qualified",
      },
      data: {
        status: ReferralStatus.closedWon,
      },
    });

    await prisma.customer.update({
      where: {
        id: referral.customerId,
      },
      data: {
        ...(stripeCustomerId && {
          stripeCustomerId,
        }),
        sales: {
          increment: 1,
        },
        saleAmount: {
          increment: saleAmount,
        },
      },
    });
  });
