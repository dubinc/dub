import { IdentityVerificationStatus } from "@dub/prisma/client";
import { EligibilityConditionDB } from "../types";
import { applicationRequirementsSchema } from "../zod/schemas/programs";

interface Context {
  country?: string | null;
  identityVerificationStatus?: IdentityVerificationStatus | null;
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
  if (applicationRequirements == null) {
    return {
      valid: true,
      reason: "noRequirements",
    };
  }

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

  const allMet = requirements.every((condition) =>
    evaluateCondition({
      condition,
      context,
    }),
  );

  return {
    valid: allMet,
    reason: allMet ? "requirementsMet" : "requirementsNotMet",
  };
}

export function evaluateCondition({
  condition,
  context,
}: {
  condition: EligibilityConditionDB;
  context: Context;
}): boolean {
  if (!context) {
    return false;
  }

  let matches = false;

  switch (condition.key) {
    case "country": {
      if (!context.country) {
        return false;
      }

      matches = condition.value.includes(context.country);

      break;
    }

    case "identityVerificationStatus": {
      matches = context.identityVerificationStatus === "approved";
      break;
    }

    default:
      return false;
  }

  return condition.operator === "is" ? matches : !matches;
}
