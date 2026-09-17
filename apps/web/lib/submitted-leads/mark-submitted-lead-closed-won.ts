"use server";

import { trackSale } from "@/lib/api/conversions/track-sale";
import { DubApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { SubmittedLeadWithCustomer } from "@/lib/types";
import { CommissionSource, Project } from "@prisma/client";

interface MarkSubmittedLeadClosedWonInput {
  workspace: Pick<Project, "id" | "stripeConnectId" | "webhookEnabled">;
  lead: SubmittedLeadWithCustomer;
  saleAmount: number;
  stripeCustomerId: string | null;
  userId: string; // user who marked the lead as closed won
}

// Mark a submitted lead as closed won
export const markSubmittedLeadClosedWon = async ({
  workspace,
  lead,
  saleAmount,
  stripeCustomerId,
  userId,
}: MarkSubmittedLeadClosedWonInput) => {
  if (!lead.customer) {
    throw new DubApiError({
      code: "bad_request",
      message: "This lead does not have a customer associated with it.",
    });
  }

  await trackSale({
    customerExternalId: lead.customer.externalId,
    amount: saleAmount,
    eventName: "Closed Won",
    paymentProcessor: "custom",
    invoiceId: null,
    metadata: null,
    workspace,
    source: "submitted",
    commissionSource: CommissionSource.user,
    userId,
  });

  if (stripeCustomerId) {
    await prisma.customer.update({
      where: {
        id: lead.customerId!,
      },
      data: {
        stripeCustomerId,
      },
    });
  }
};
