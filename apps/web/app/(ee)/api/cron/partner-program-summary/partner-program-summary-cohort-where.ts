import { Prisma } from "@dub/prisma/client";

/**
 * Enrollments the monthly partner program summary cron loads before analytics + email.
 *
 * Used by `POST …/process` when querying `programEnrollment`.
 * E2E `GET /api/e2e/partner-program-summary` imports the same filter.
 *
 * @see ./process/route.ts
 */
export function partnerProgramSummaryCohortWhere(
  programId: string,
): Prisma.ProgramEnrollmentWhereInput {
  return {
    programId,
    status: "approved",
    partner: {
      users: {
        some: {
          notificationPreferences: {
            is: {
              monthlyProgramSummary: true,
            },
          },
        },
      },
    },
    links: {
      some: {
        leads: {
          gt: 0,
        },
      },
    },
  };
}
