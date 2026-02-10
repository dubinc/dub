"use server";

import { trackSale } from "@/lib/api/conversions/track-sale";
import { DubApiError } from "@/lib/api/errors";
import { ReferralWithCustomer } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { Project } from "@dub/prisma/client";

interface MarkReferralClosedWonInput {
  workspace: Pick<Project, "id" | "stripeConnectId" | "webhookEnabled">;
  referral: ReferralWithCustomer;
  saleAmount: number;
  stripeCustomerId: string | null;
}

// Mark a partner referral as closed won
export const markReferralClosedWon = async ({
  workspace,
  referral,
  saleAmount,
  stripeCustomerId,
}: MarkReferralClosedWonInput) => {
  if (!referral.customer) {
    throw new DubApiError({
      code: "bad_request",
      message: "This referral does not have a customer associated with it.",
    });
  }

  await trackSale({
    customerExternalId: referral.customer.externalId,
    amount: saleAmount,
    eventName: "Closed Won",
    paymentProcessor: "custom",
    invoiceId: null,
    metadata: null,
    rawBody: {},
    workspace,
    source: "submitted",
  });

  if (stripeCustomerId) {
    await prisma.customer.update({
      where: {
        id: referral.customerId!,
      },
      data: {
        stripeCustomerId,
      },
    });
  }
};
