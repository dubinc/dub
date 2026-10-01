import { prisma } from "@/lib/prisma";
import { FraudEventContext } from "@/lib/types";
import { defineFraudRule } from "../define-fraud-rule";

// The click ID on this lead or sale commission was already attributed to a
// different customer for the same partner.
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

    return {
      triggered: true,
      metadata: {
        clickId,
        matchedCustomerId: matchedCustomer.id,
      },
    };
  },
});
