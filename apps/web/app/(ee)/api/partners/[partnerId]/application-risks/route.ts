import { getPartnerHighRiskSignals } from "@/lib/api/fraud/get-partner-high-risk-signals";
import { checkPartnerEmailDomainMismatch } from "@/lib/api/fraud/rules/check-partner-email-domain-mismatch";
import { checkPartnerEmailMasked } from "@/lib/api/fraud/rules/check-partner-email-masked";
import { checkPartnerNoSocialLinks } from "@/lib/api/fraud/rules/check-partner-no-social-links";
import { checkPartnerNoVerifiedSocialLinks } from "@/lib/api/fraud/rules/check-partner-no-verified-social-links";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withWorkspace } from "@/lib/auth";
import { ExtendedFraudRuleType } from "@/lib/types";
import { NextResponse } from "next/server";

// GET /api/partners/:partnerId/application-risks - get application risks for a partner
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { partnerId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partner } = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      include: {
        partner: true,
      },
    });

    const { hasCrossProgramBan, hasDuplicatePayoutMethod } =
      await getPartnerHighRiskSignals({
        program: { id: programId },
        partner,
      });

    const risks: Partial<Record<ExtendedFraudRuleType, boolean>> = {
      partnerCrossProgramBan: hasCrossProgramBan,
      partnerDuplicatePayoutMethod: hasDuplicatePayoutMethod,
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
