import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS } from "@/lib/tremendous/constants";
import { Prisma, Program, Project } from "@prisma/client";

export function getPayoutEligibilityFilter({
  program,
  workspace,
}: {
  program: Pick<Program, "id" | "minPayoutAmount" | "payoutMode">;
  workspace: Pick<Project, "plan">;
}): Prisma.PayoutWhereInput {
  const commonWhere: Prisma.PayoutWhereInput = {
    programId: program.id,
    status: "pending",
    invoiceId: null,
    amount: {
      gte: program.minPayoutAmount,
    },
    // Filter out payouts from partners with pending fraud events (for eligible workspaces)
    ...(getPlanCapabilities(workspace.plan).canManageFraudEvents && {
      programEnrollment: {
        fraudEventGroups: {
          none: { status: "pending" },
        },
      },
    }),
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
