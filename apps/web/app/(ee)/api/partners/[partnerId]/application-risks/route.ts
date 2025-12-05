import { getApplicationRiskSignals } from "@/lib/api/fraud/get-application-risk-signals";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withWorkspace } from "@/lib/auth";
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

    const { riskSignals, severity } = await getApplicationRiskSignals({
      program: { id: programId },
      partner,
    });

    return NextResponse.json({
      risksDetected: riskSignals,
      riskSeverity: severity,
    });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
