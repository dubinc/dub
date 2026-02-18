import { DubApiError } from "@/lib/api/errors";
import { CreateBountyInput } from "@/lib/types";

export function validateBounty({
  type,
  startsAt,
  endsAt,
  submissionsOpenAt,
  submissionRequirements,
  rewardAmount,
  rewardDescription,
  performanceScope,
}: Partial<CreateBountyInput>) {
  startsAt = startsAt || new Date();

  if (endsAt && endsAt < startsAt) {
    throw new DubApiError({
      message:
        "Bounty end date (endsAt) must be on or after start date (startsAt).",
      code: "bad_request",
    });
  }

  if (submissionsOpenAt) {
    if (!endsAt) {
      throw new DubApiError({
        message:
          "An end date is required to determine when the submission window opens.",
        code: "bad_request",
      });
    }

    if (submissionsOpenAt < startsAt) {
      throw new DubApiError({
        message:
          "Bounty submissions open date (submissionsOpenAt) must be on or after start date (startsAt).",
        code: "bad_request",
      });
    }

    if (submissionsOpenAt > endsAt) {
      throw new DubApiError({
        message:
          "Bounty submissions open date (submissionsOpenAt) must be on or before end date (endsAt).",
        code: "bad_request",
      });
    }
  }

  if (rewardAmount === null || rewardAmount === 0) {
    if (type === "performance") {
      throw new DubApiError({
        code: "bad_request",
        message: "Reward amount is required for performance bounties.",
      });
    } else {
      const isSocialMetrics =
        submissionRequirements &&
        typeof submissionRequirements === "object" &&
        "socialMetrics" in submissionRequirements;
      if (!isSocialMetrics && !rewardDescription) {
        throw new DubApiError({
          code: "bad_request",
          message:
            "For submission bounties, either reward amount or reward description is required.",
        });
      }
    }
  }

  if (rewardAmount && rewardAmount < 0) {
    throw new DubApiError({
      code: "bad_request",
      message: "Reward amount cannot be negative.",
    });
  }

  if (!performanceScope && type === "performance") {
    throw new DubApiError({
      code: "bad_request",
      message: "performanceScope must be set for performance bounties.",
    });
  }
}
