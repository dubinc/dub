import { Prisma, Program } from "@dub/prisma/client";

export function getPayoutEligibilityFilter(
  program: Pick<Program, "id" | "minPayoutAmount" | "payoutMode">,
): Prisma.PayoutWhereInput {
  const commonWhere: Prisma.PayoutWhereInput = {
    programId: program.id,
    status: "pending",
    invoiceId: null,
    amount: {
      gte: program.minPayoutAmount,
    },
    // Filter out payouts from partners with pending fraud events
    programEnrollment: {
      fraudEventGroups: {
        every: {
          status: "resolved",
        },
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
        partner: {
          programs: {
            some: {
              programId: program.id,
              tenantId: {
                not: null,
              },
            },
          },
        },
      };

    // Hybrid mode: internal payouts require payoutsEnabledAt !== null, external payouts require tenantId !== null
    case "hybrid":
      return {
        ...commonWhere,
        partner: {
          OR: [
            {
              payoutsEnabledAt: {
                not: null,
              },
            },
            {
              payoutsEnabledAt: null,
              programs: {
                some: {
                  programId: program.id,
                  tenantId: {
                    not: null,
                  },
                },
              },
            },
          ],
        },
      };

    default:
      throw new Error(`Unsupported payout mode: ${program.payoutMode}`);
  }
}
