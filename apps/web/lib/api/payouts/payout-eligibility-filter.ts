import { isProductionEnvironment } from "@/lib/sandbox/environment";
import {
  TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS,
  TREMENDOUS_MIN_PAYOUT_AMOUNT_CENTS,
} from "@/lib/tremendous/constants";
import { Prisma, Program, ProgramPayoutMode } from "@prisma/client";

export function getPayoutEligibilityFilter({
  program,
}: {
  program: Pick<
    Program,
    "id" | "minPayoutAmount" | "payoutMode" | "environment"
  >;
}): Prisma.PayoutWhereInput {
  let commonWhere: Prisma.PayoutWhereInput = {
    programId: program.id,
    status: "pending",
    invoiceId: null,
    amount: {
      gte: program.minPayoutAmount,
    },
  };

  // Non-production internal and hybrid payouts are simulated, so a missing
  // payout connection should not block them. External mode still requires a tenant ID.
  if (
    !isProductionEnvironment(program.environment) &&
    (
      [
        ProgramPayoutMode.internal,
        ProgramPayoutMode.hybrid,
      ] as ProgramPayoutMode[]
    ).includes(program.payoutMode)
  ) {
    return commonWhere;
  }

  commonWhere = {
    ...commonWhere,
    // Gift card payouts must be within the Tremendous allowed range
    NOT: {
      partner: {
        defaultPayoutMethod: "tremendous",
      },
      OR: [
        { amount: { lt: TREMENDOUS_MIN_PAYOUT_AMOUNT_CENTS } },
        { amount: { gt: TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS } },
      ],
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
