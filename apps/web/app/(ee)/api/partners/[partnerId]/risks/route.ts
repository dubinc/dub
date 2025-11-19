import { checkPartnerEmailDomainMismatch } from "@/lib/api/fraud/rules/check-partner-email-domain-mismatch";
import { checkPartnerEmailMasked } from "@/lib/api/fraud/rules/check-partner-email-masked";
import { checkPartnerNoSocialLinks } from "@/lib/api/fraud/rules/check-partner-no-social-links";
import { checkPartnerNoVerifiedSocialLinks } from "@/lib/api/fraud/rules/check-partner-no-verified-social-links";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withWorkspace } from "@/lib/auth";
import { ExtendedFraudRuleType } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partners/:id/risks
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { partnerId } = params;

    const { partner } = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      include: {
        partner: true,
      },
    });

    const [crossProgramBan, duplicatePayoutMethod] = await Promise.all([
      // Check cross program ban
      prisma.programEnrollment.count({
        where: {
          partnerId: partner.id,
          programId: {
            not: programId,
          },
          status: "banned",
        },
      }),

      // Check duplicate payout method
      prisma.partner.count({
        where: {
          payoutMethodHash: partner.payoutMethodHash,
        },
      }),
    ]);

    const risks: Partial<Record<ExtendedFraudRuleType, boolean>> = {
      partnerCrossProgramBan: crossProgramBan > 0,
      partnerDuplicatePayoutMethod: duplicatePayoutMethod > 0,
      partnerEmailDomainMismatch: checkPartnerEmailDomainMismatch(partner),
      partnerEmailMasked: checkPartnerEmailMasked(partner),
      partnerNoSocialLinks: checkPartnerNoSocialLinks(partner),
      partnerNoVerifiedSocialLinks: checkPartnerNoVerifiedSocialLinks(partner),
    };

    return NextResponse.json(risks);
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
