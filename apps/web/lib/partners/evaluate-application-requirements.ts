import { applicationRequirementsSchema } from "../zod/schemas/programs";
import { partnerMeetsAllRequirements } from "./check-eligibility-requirements";

interface Context {
  country?: string | null;
}

interface Result {
  valid: boolean;
  reason:
    | "invalidRequirements"
    | "noRequirements"
    | "requirementsMet"
    | "requirementsNotMet";
}

export function evaluateApplicationRequirements({
  applicationRequirements,
  context,
}: {
  applicationRequirements: unknown;
  context: Context;
}): Result {
  const parsed = applicationRequirementsSchema.safeParse(
    applicationRequirements,
  );

  if (!parsed.success) {
    return {
      valid: false,
      reason: "invalidRequirements",
    };
  }

  const requirements = parsed.data;

  if (!requirements?.length) {
    return {
      valid: true,
      reason: "noRequirements",
    };
  }

  const allMet = partnerMeetsAllRequirements(requirements, context);

  return {
    valid: allMet,
    reason: allMet ? "requirementsMet" : "requirementsNotMet",
  };
}
