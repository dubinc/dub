import { DubApiError } from "@/lib/api/errors";
import { CreateBountyInput } from "@/lib/types";
import { BountyStartMode } from "@prisma/client";

export function validateBounty({
  type,
  startsAt,
  endsAt,
  startMode,
  endsAfterDays,
  submissionsOpenAt,
  submissionFrequency,
  maxSubmissions,
  rewardAmount,
  rewardDescription,
  performanceScope,
}: Partial<CreateBountyInput>) {
  startMode = startMode ?? BountyStartMode.absolute;

  // startsAt is required when startMode is absolute and must be null when
  // startMode is relative (relative bounties start when a partner joins).
  if (startMode === BountyStartMode.relative) {
    if (startsAt != null) {
      throw new DubApiError({
        message:
          "startsAt is not supported when the bounty starts when a partner joins. It must be null for relative bounties.",
        code: "bad_request",
      });
    }
  } else {
    // Default to now when an absolute bounty doesn't specify a start date
    startsAt = startsAt || new Date();
  }

  if (endsAt && endsAfterDays) {
    throw new DubApiError({
      message:
        "Bounty cannot have both an end date (endsAt) and endsAfterDays.",
      code: "bad_request",
    });
  }

  if (startMode === BountyStartMode.absolute && endsAfterDays) {
    throw new DubApiError({
      message:
        "endsAfterDays is only supported when the bounty starts when a partner joins.",
      code: "bad_request",
    });
  }

  if (endsAt && startsAt && endsAt < startsAt) {
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

    if (startsAt && submissionsOpenAt < startsAt) {
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
    }

    if (!rewardDescription) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "For submission bounties, either reward amount or reward description is required.",
      });
    }
  }

  if (!performanceScope && type === "performance") {
    throw new DubApiError({
      code: "bad_request",
      message: "performanceScope must be set for performance bounties.",
    });
  }

  // submission bounty checks
  if (type === "submission") {
    if (submissionFrequency && maxSubmissions == null) {
      throw new DubApiError({
        code: "bad_request",
        message: "maxSubmissions is required when submissionFrequency is set.",
      });
    }

    if (submissionFrequency && !endsAt && !endsAfterDays) {
      throw new DubApiError({
        code: "bad_request",
        message: "An end date is required when submissionFrequency is set.",
      });
    }
  }
}
