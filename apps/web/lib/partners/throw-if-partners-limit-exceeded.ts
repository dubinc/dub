import { DubApiError } from "@/lib/api/errors";
import { Project } from "@dub/prisma/client";
import { isWorkspaceBillingTrialActive } from "@dub/utils";

export function throwIfPartnersLimitExceeded({
  partnersUsage,
  partnersLimit,
  additionalEnrollments = 1,
  trialEndsAt,
}: Pick<Project, "partnersUsage" | "partnersLimit" | "trialEndsAt"> & {
  additionalEnrollments?: number;
}) {
  if (partnersUsage + additionalEnrollments > partnersLimit) {
    const isTrial = isWorkspaceBillingTrialActive(trialEndsAt);

    throw new DubApiError({
      code: "forbidden",
      message: isTrial
        ? `During your free trial you can have at most ${partnersLimit} partners in your program. Start a paid plan to add more.`
        : `You've reached your partners limit of ${partnersLimit} for your current plan. Upgrade your plan to add more partners.`,
    });
  }
}
