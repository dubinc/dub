import {
  EvaluatePartnerApplicationInput,
  evaluateApplicationScreening,
} from "@/lib/ai/evaluate-partner-application";
import { DubApiError } from "@/lib/api/errors";
import { logger } from "@/lib/axiom/server";
import { ProgramApplicationRejectionReason } from "@prisma/client";
import { rejectProgramApplication } from "./reject-program-application";

/**
 * Rejects a pending application when Jev is confident it matches the program's
 * written screening criteria. Fails open, so an unavailable Jev never rejects.
 * Returns true when the criteria matched, i.e. the application must not be approved.
 */
export async function screenPartnerApplication({
  programId,
  partnerId,
  applicationId,
  ...input
}: EvaluatePartnerApplicationInput & {
  programId: string;
  partnerId: string;
  applicationId: string;
  screeningCriteria: string;
}) {
  const evaluation = await evaluateApplicationScreening(input);

  logger.info("jev.partner.application-screening", {
    programId,
    partnerId,
    applicationId,
    status: evaluation.status,
    probability: evaluation.probability,
    error: evaluation.error,
    usage: evaluation.usage,
  });
  await logger.flush();

  if (evaluation.status !== "matched") {
    return false;
  }

  try {
    await rejectProgramApplication({
      programId,
      partnerId,
      applicationId,
      rejectionReason: ProgramApplicationRejectionReason.notTheRightFit,
      rejectionNote: undefined,
      reapplicationTimeframe: "standard",
      flagForFraudReason: undefined,
    });
  } catch (error) {
    // Already reviewed, or the enrollment can no longer be rejected. The match
    // still stands, so the caller must not approve.
    if (error instanceof DubApiError) {
      console.warn(
        `Could not reject application ${applicationId} after screening: ${error.message}`,
      );
      return true;
    }

    throw error;
  }

  console.info(
    `Successfully rejected application ${applicationId} in program ${programId} (application screening).`,
  );

  return true;
}
