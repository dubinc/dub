import { prisma } from "@/lib/prisma";
import { FraudEventContext } from "@/lib/types";
import { defineFraudRule } from "../define-fraud-rule";
import { createFraudEventHash } from "../utils";

// Flags the customer when another customer of the same partner shares
// this click ID, no matter which customer came first.
export const checkCustomerSharedClickId = defineFraudRule({
  type: "customerSharedClickId",
  evaluate: async ({
    program,
    partner,
    customer,
    click,
  }: FraudEventContext) => {
    const clickId = click.clickId;

    if (!clickId) {
      return {
        triggered: false,
      };
    }

    const matchedCustomer = await prisma.customer.findFirst({
      where: {
        clickId,
        programId: program.id,
        partnerId: partner.id,
        id: {
          not: customer.id,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
      },
    });

    if (!matchedCustomer) {
      return {
        triggered: false,
      };
    }

    // A resolved event for this customer stays closed. A pending one still
    // holds later commissions.
    const resolvedEvent = await prisma.fraudEvent.findFirst({
      where: {
        hash: createFraudEventHash({
          type: "customerSharedClickId",
          programId: program.id,
          partnerId: partner.id,
          customerId: customer.id,
        }),
        fraudEventGroup: {
          status: "resolved",
        },
      },
      select: {
        id: true,
      },
    });

    if (resolvedEvent) {
      return {
        triggered: false,
      };
    }

    return {
      triggered: true,
      metadata: {
        clickId,
        matchedCustomerId: matchedCustomer.id,
      },
    };
  },
});
