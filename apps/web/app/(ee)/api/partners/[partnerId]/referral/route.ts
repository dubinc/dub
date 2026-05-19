import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withWorkspace } from "@/lib/auth";
import { partnerReferralSchema } from "@/lib/partner-referrals/schemas";
import { prisma } from "@dub/prisma";
import { toCentsNumber } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/partners/:partnerId/referral – referral snapshot for a partner in the program.
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { partnerId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      include: {
        applicationEvent: {
          select: {
            referredByPartnerId: true,
          },
        },
      },
    });

    const referredByPartnerId =
      programEnrollment.applicationEvent?.referredByPartnerId;

    const [referredByProgramEnrollment, programEnrollmentStats] =
      await Promise.all([
        referredByPartnerId
          ? prisma.programEnrollment.findUnique({
              where: {
                partnerId_programId: {
                  partnerId: referredByPartnerId,
                  programId,
                },
              },
              select: {
                partner: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
            })
          : Promise.resolve(null),

        prisma.programEnrollment.aggregate({
          where: {
            programId,
            applicationEvent: {
              referredByPartnerId: partnerId,
            },
          },
          _sum: {
            totalConversions: true,
            totalSaleAmount: true,
          },
          _count: {
            _all: true,
          },
        }),
      ]);

    return NextResponse.json(
      partnerReferralSchema.parse({
        referredBy: referredByProgramEnrollment?.partner ?? null,
        stats: {
          totalPartners: programEnrollmentStats._count._all,
          totalConversions: toCentsNumber(
            programEnrollmentStats._sum.totalConversions,
          ),
          totalSaleAmount: toCentsNumber(
            programEnrollmentStats._sum.totalSaleAmount,
          ),
        },
      }),
    );
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);
