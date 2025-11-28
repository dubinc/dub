import { getApplicationRiskSignals } from "@/lib/api/fraud/get-application-risk-signals";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { NextResponse } from "next/server";

// GET /api/partners/:partnerId/application-risks - get application risks for a partner
export const GET = withWorkspace(async ({ workspace, params }) => {
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

  const { canManageFraudEvents } = getPlanCapabilities(workspace.plan);

  // Return the response with risksDetected only if the workspace has fraud management capabilities,
  // otherwise return an empty object to hide sensitive fraud detection details
  return NextResponse.json({
    risksDetected: canManageFraudEvents ? riskSignals : {},
    riskSeverity: severity,
  });
});
