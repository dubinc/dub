import {
  EvaluatePartnerApplicationInput,
  evaluateApplicationScreening,
} from "@/lib/ai/evaluate-partner-application";
import { logger } from "@/lib/axiom/server";
import { ProgramApplicationRejectionReason } from "@prisma/client";
import { rejectPendingEnrollment } from "./reject-pending-enrollment";

/**
 * Rejects a pending application when Jev is confident it matches the program's
 * written screening criteria. Fails open, so an unavailable Jev never rejects.
 * Returns true when the criteria matched, i.e. the application must not be approved.
 */
export async function screenPartnerApplication({
  programId,
  partnerId,
  ...input
}: EvaluatePartnerApplicationInput & {
  programId: string;
  partnerId: string;
  screeningCriteria: string;
}) {
  const evaluation = await evaluateApplicationScreening(input);

  logger.info("jev.partner.application-screening", {
    programId,
    partnerId,
    status: evaluation.status,
    probability: evaluation.probability,
    error: evaluation.error,
    usage: evaluation.usage,
  });
  await logger.flush();

  if (evaluation.status !== "matched") {
    return false;
  }

  const rejected = await rejectPendingEnrollment({
    programId,
    partnerId,
    rejectionReason: ProgramApplicationRejectionReason.notTheRightFit,
  });

  console.info(
    rejected
      ? `Successfully rejected partner ${partnerId} in program ${programId} (application screening).`
      : `Partner ${partnerId} is no longer pending in program ${programId}.`,
  );

  return true;
}
