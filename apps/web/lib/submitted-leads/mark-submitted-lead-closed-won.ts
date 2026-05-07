"use server";

import { trackSale } from "@/lib/api/conversions/track-sale";
import { DubApiError } from "@/lib/api/errors";
import { SubmittedLeadWithCustomer } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { Project } from "@dub/prisma/client";

interface MarkSubmittedLeadClosedWonInput {
  workspace: Pick<Project, "id" | "stripeConnectId" | "webhookEnabled">;
  lead: SubmittedLeadWithCustomer;
  saleAmount: number;
  stripeCustomerId: string | null;
}

// Mark a submitted lead as closed won
export const markSubmittedLeadClosedWon = async ({
  workspace,
  lead,
  saleAmount,
  stripeCustomerId,
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
