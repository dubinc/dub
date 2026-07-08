import { TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS } from "@/lib/tremendous/constants";
import { Prisma, Program } from "@prisma/client";

export function getPayoutEligibilityFilter({
  program,
}: {
  program: Pick<Program, "id" | "minPayoutAmount" | "payoutMode">;
}): Prisma.PayoutWhereInput {
  const commonWhere: Prisma.PayoutWhereInput = {
    programId: program.id,
    status: "pending",
    invoiceId: null,
    amount: {
      gte: program.minPayoutAmount,
    },
    // Gift card payouts are capped at $2,000 per payout
    NOT: {
      partner: {
        defaultPayoutMethod: "tremendous",
      },
      amount: {
        gt: TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS,
      },
    },
  };

  switch (program.payoutMode) {
    // Internal mode: all payouts are internal, require payoutsEnabledAt !== null
    case "internal":
      return {
        ...commonWhere,
        partner: {
          payoutsEnabledAt: {
            not: null,
          },
        },
      };

    // External mode: all payouts are external, require tenantId !== null
    case "external":
      return {
        ...commonWhere,
        programEnrollment: {
          tenantId: {
            not: null,
          },
        },
      };

    // Hybrid mode: internal payouts require payoutsEnabledAt !== null, external payouts require tenantId !== null
    case "hybrid":
      return {
        ...commonWhere,
        OR: [
          {
            partner: {
              payoutsEnabledAt: {
                not: null,
              },
            },
          },
          {
            programEnrollment: {
              tenantId: {
                not: null,
              },
            },
          },
        ],
      };

    default:
      throw new Error(`Unsupported payout mode: ${program.payoutMode}`);
  }
}
