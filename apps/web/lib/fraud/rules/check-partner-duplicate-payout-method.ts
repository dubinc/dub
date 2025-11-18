import { prisma } from "@dub/prisma";
import { defineFraudRule } from "../define-fraud-rule";
import { FraudPartnerContext } from "../types";

export const checkPartnerDuplicatePayoutMethod = defineFraudRule({
  type: "partnerDuplicatePayoutMethod",
  evaluate: async ({ partner }: FraudPartnerContext) => {
    console.log("Evaluating checkPartnerDuplicatePayoutMethod...");

    // Return false if payoutMethodHash is missing
    if (!partner.payoutMethodHash) {
      return {
        triggered: false,
      };
    }

    // Check for other partners with matching payoutMethodHash
    const duplicatePartners = await prisma.partner.count({
      where: {
        id: {
          not: partner.id,
        },
        payoutMethodHash: partner.payoutMethodHash,
      },
    });

    return {
      triggered: duplicatePartners > 0,
    };
  },
});
