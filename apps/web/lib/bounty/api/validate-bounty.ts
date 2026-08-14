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
          "`startsAt` is not supported when the `startMode` is `relative`.",
        code: "bad_request",
      });
    }
  } else {
    // Default to now when an absolute bounty doesn't specify a start date
    startsAt = startsAt || new Date();
  }

  if (endsAt && endsAfterDays) {
    throw new DubApiError({
      message: "Bounties cannot have both `endsAt` and `endsAfterDays`.",
      code: "bad_request",
    });
  }

  if (startMode === BountyStartMode.absolute && endsAfterDays) {
    throw new DubApiError({
      message:
        "`endsAfterDays` is only supported when the `startMode` is `relative`.",
      code: "bad_request",
    });
  }

  if (endsAt && startsAt && endsAt < startsAt) {
    throw new DubApiError({
      message:
        "The bounty's end date (`endsAt`) must be on or after the start date (`startsAt`).",
      code: "bad_request",
    });
  }

  if (submissionsOpenAt) {
    if (!endsAt) {
      throw new DubApiError({
        message: "`endsAt` is required when `submissionsOpenAt` is set.",
        code: "bad_request",
      });
    }

    if (startsAt && submissionsOpenAt < startsAt) {
      throw new DubApiError({
        message: "`submissionsOpenAt` must be on or after `startsAt`.",
        code: "bad_request",
      });
    }

    if (submissionsOpenAt > endsAt) {
      throw new DubApiError({
        message: "`submissionsOpenAt` must be on or before `endsAt`.",
        code: "bad_request",
      });
    }
  }

  if (rewardAmount === null || rewardAmount === 0) {
    if (type === "performance") {
      throw new DubApiError({
        code: "bad_request",
        message: "`rewardAmount` is required for `performance` bounties.",
      });
    }

    if (!rewardDescription) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "For `submission` bounties, either `rewardAmount` or `rewardDescription` is required.",
      });
    }
  }

  if (!performanceScope && type === "performance") {
    throw new DubApiError({
      code: "bad_request",
      message: "`performanceScope` must be set for `performance` bounties.",
    });
  }

  if (
    startMode === BountyStartMode.relative &&
    performanceScope === "lifetime"
  ) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "`lifetime` performance scope is not supported when the `startMode` is `relative`.",
    });
  }

  // submission bounty checks
  if (type === "submission") {
    if (submissionFrequency && maxSubmissions == null) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "`maxSubmissions` is required when `submissionFrequency` is set.",
      });
    }

    if (submissionFrequency && !endsAt && !endsAfterDays) {
      throw new DubApiError({
        code: "bad_request",
        message: "`endsAt` is required when `submissionFrequency` is set.",
      });
    }
  }
}
