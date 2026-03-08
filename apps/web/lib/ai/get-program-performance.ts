import { prisma } from "@dub/prisma";
import { CommissionStatus, PayoutStatus } from "@dub/prisma/client";
import { tool } from "ai";
import { z } from "zod";
import { getSession } from "../auth/utils";

const programPerformanceSchema = z.object({
  program: z.object({
    name: z.string().describe("The name of the program."),
    supportEmail: z
      .string()
      .describe(
        "The support email of the program. Useful for letting the user know how to contact the program's support team.",
      ),
    minPayoutAmount: z
      .number()
      .describe(
        "The minimum payout amount for the program in USD cents. If the partner's earnings are less than this amount, it will not be eligible for payout.",
      ),
  }),
  commissions: z.array(
    z.object({
      status: z
        .enum(CommissionStatus)
        .describe("The status of the commission."),
      earningsInCents: z.number().describe("Total earnings in USD cents"),
    }),
  ),
  payouts: z.array(
    z.object({
      amount: z.number().describe("The amount of the payout in USD cents."),
      status: z.enum(PayoutStatus).describe("The status of the payout."),
      stripePayoutTraceId: z
        .string()
        .nullish()
        .describe(
          "The payout trace ID. Useful for tracking delayed payouts – if the partner asks about a delayed payout, provide them with the trace ID for them to track the status of the payout with their bank.",
        ),
      createdAt: z.date().describe("The date and time the payout was created."),
      periodStart: z.date().describe("The start date of the payout period."),
      periodEnd: z.date().describe("The end date of the payout period."),
    }),
  ),
  holdingPeriodDays: z
    .number()
    .describe(
      "The number of days that commissions are held in 'pending' status until they are eligible for payout.",
    ),
});

export const getProgramPerformanceTool = tool({
  description:
    "Retrives the partner's performance for a given program (commissions, payouts, etc.) along with the program's details.",
  inputSchema: z.object({
    programId: z.string().describe("The unique ID of the program."),
  }),
  outputSchema: programPerformanceSchema,
  execute: async ({ programId }) => {
    const session = await getSession();
    if (!session?.user.id) {
      return {
        error: "Unauthorized. Please log in to continue.",
      };
    }
    const programEnrollment = await prisma.programEnrollment.findFirst({
      where: {
        programId,
        partner: {
          users: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
      include: {
        program: {
          include: {
            groups: {
              where: {
                slug: "default",
              },
            },
          },
        },
        partnerGroup: true,
      },
    });
    if (!programEnrollment) {
      return {
        error: "Partner not enrolled in program",
      };
    }
    const [commissions, payouts] = await Promise.all([
      prisma.commission.groupBy({
        by: ["status"],
        where: {
          earnings: {
            gt: 0,
          },
          programId: programEnrollment.programId,
          partnerId: programEnrollment.partnerId,
        },
        _sum: {
          earnings: true,
        },
      }),
      prisma.payout.findMany({
        where: {
          programId: programEnrollment.programId,
          partnerId: programEnrollment.partnerId,
        },
        take: 100, // limit to latest 100 payouts
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    const data = programPerformanceSchema.parse({
      program: programEnrollment.program,
      holdingPeriodDays:
        programEnrollment.partnerGroup?.holdingPeriodDays ??
        programEnrollment.program.groups[0]?.holdingPeriodDays ??
        0,
      commissions: commissions.map((commission) => ({
        status: commission.status,
        earningsInCents: commission._sum.earnings,
      })),
      payouts,
    });

    return data;
  },
});
