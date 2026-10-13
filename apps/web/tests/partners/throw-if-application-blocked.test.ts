import { throwIfApplicationBlocked } from "@/lib/program-applications/throw-if-application-blocked";
import { STANDARD_REAPPLICATION_DAYS } from "@dub/utils";
import {
  ProgramEnrollmentStatus,
  ReapplicationTimeframe,
} from "@prisma/client";
import { addMinutes, subDays, subMinutes } from "date-fns";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const NOW = new Date("2026-06-15T12:00:00.000Z");
const TARGET_GROUP_ID = "grp_target";
const OTHER_GROUP_ID = "grp_other";

const PENDING_MESSAGE =
  "You have an existing application for this program. Please wait for it to be reviewed.";
const NEVER_MESSAGE = "You cannot reapply to this program.";
const STANDARD_MESSAGE = `You can reapply to this program after ${STANDARD_REAPPLICATION_DAYS} days.`;
const SAME_GROUP_MESSAGE = "You're already in this group.";

function enrollment(
  status: ProgramEnrollmentStatus,
  reapplicationTimeframe: ReapplicationTimeframe = ReapplicationTimeframe.standard,
  groupId: string | null = OTHER_GROUP_ID,
) {
  return { status, groupId, reapplicationTimeframe };
}

describe("throwIfApplicationBlocked", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([null, undefined])("allows when enrollment is %s", (value) => {
    expect(() =>
      throwIfApplicationBlocked({
        enrollment: value,
        groupId: TARGET_GROUP_ID,
        rejectedAt: subDays(NOW, 1),
      }),
    ).not.toThrow();
  });

  describe("pending", () => {
    it.each(Object.values(ReapplicationTimeframe))(
      "blocks with %s timeframe",
      (timeframe) => {
        expect(() =>
          throwIfApplicationBlocked({
            enrollment: enrollment(ProgramEnrollmentStatus.pending, timeframe),
            groupId: TARGET_GROUP_ID,
          }),
        ).toThrow(PENDING_MESSAGE);
      },
    );
  });

  describe("rejected", () => {
    it("blocks permanently with never timeframe", () => {
      expect(() =>
        throwIfApplicationBlocked({
          enrollment: enrollment(
            ProgramEnrollmentStatus.rejected,
            ReapplicationTimeframe.never,
          ),
          groupId: TARGET_GROUP_ID,
        }),
      ).toThrow(NEVER_MESSAGE);
    });

    it("blocks with standard timeframe regardless of rejectedAt", () => {
      for (const rejectedAt of [null, subDays(NOW, 1), subDays(NOW, 90)]) {
        expect(() =>
          throwIfApplicationBlocked({
            enrollment: enrollment(
              ProgramEnrollmentStatus.rejected,
              ReapplicationTimeframe.standard,
            ),
            groupId: TARGET_GROUP_ID,
            rejectedAt,
          }),
        ).toThrow(STANDARD_MESSAGE);
      }
    });

    it("blocks with instant timeframe", () => {
      expect(() =>
        throwIfApplicationBlocked({
          enrollment: enrollment(
            ProgramEnrollmentStatus.rejected,
            ReapplicationTimeframe.instant,
          ),
          groupId: TARGET_GROUP_ID,
          rejectedAt: subDays(NOW, 1),
        }),
      ).toThrow(
        "You have already applied to this program. You cannot apply to this program again.",
      );
    });
  });

  it("blocks invited enrollments", () => {
    expect(() =>
      throwIfApplicationBlocked({
        enrollment: enrollment(ProgramEnrollmentStatus.invited),
        groupId: TARGET_GROUP_ID,
      }),
    ).toThrow("You have a pending invitation to join this program.");
  });

  it("blocks declined enrollments", () => {
    expect(() =>
      throwIfApplicationBlocked({
        enrollment: enrollment(ProgramEnrollmentStatus.declined),
        groupId: TARGET_GROUP_ID,
      }),
    ).toThrow(
      "You have declined your invitation to join this program. Please contact program owner to re-invite you.",
    );
  });

  it.each([
    ProgramEnrollmentStatus.banned,
    ProgramEnrollmentStatus.deactivated,
    ProgramEnrollmentStatus.archived,
  ])("blocks %s enrollments", (status) => {
    expect(() =>
      throwIfApplicationBlocked({
        enrollment: enrollment(status, ReapplicationTimeframe.instant),
        groupId: TARGET_GROUP_ID,
      }),
    ).toThrow(
      `You cannot apply to this program again because your enrollment is ${status}.`,
    );
  });

  describe("approved", () => {
    it.each(Object.values(ReapplicationTimeframe))(
      "blocks applying to the current group with %s timeframe",
      (timeframe) => {
        expect(() =>
          throwIfApplicationBlocked({
            enrollment: enrollment(
              ProgramEnrollmentStatus.approved,
              timeframe,
              TARGET_GROUP_ID,
            ),
            groupId: TARGET_GROUP_ID,
            rejectedAt: subDays(NOW, 1),
          }),
        ).toThrow(SAME_GROUP_MESSAGE);
      },
    );

    it.each(Object.values(ReapplicationTimeframe))(
      "allows another group without a rejection date (%s timeframe)",
      (timeframe) => {
        for (const rejectedAt of [undefined, null]) {
          expect(() =>
            throwIfApplicationBlocked({
              enrollment: enrollment(
                ProgramEnrollmentStatus.approved,
                timeframe,
              ),
              groupId: TARGET_GROUP_ID,
              rejectedAt,
            }),
          ).not.toThrow();
        }
      },
    );

    it("allows another group immediately with instant timeframe", () => {
      expect(() =>
        throwIfApplicationBlocked({
          enrollment: enrollment(
            ProgramEnrollmentStatus.approved,
            ReapplicationTimeframe.instant,
          ),
          groupId: TARGET_GROUP_ID,
          rejectedAt: NOW,
        }),
      ).not.toThrow();
    });

    it("blocks another group with never timeframe, even after the standard window", () => {
      for (const rejectedAt of [subDays(NOW, 1), subDays(NOW, 90)]) {
        expect(() =>
          throwIfApplicationBlocked({
            enrollment: enrollment(
              ProgramEnrollmentStatus.approved,
              ReapplicationTimeframe.never,
            ),
            groupId: TARGET_GROUP_ID,
            rejectedAt,
          }),
        ).toThrow(NEVER_MESSAGE);
      }
    });

    describe("standard timeframe", () => {
      const standardEnrollment = enrollment(
        ProgramEnrollmentStatus.approved,
        ReapplicationTimeframe.standard,
      );

      it.each([
        ["just now", NOW],
        ["1 day ago", subDays(NOW, 1)],
        [
          "1 minute before the window ends",
          addMinutes(subDays(NOW, STANDARD_REAPPLICATION_DAYS), 1),
        ],
      ])("blocks another group when rejected %s", (_label, rejectedAt) => {
        expect(() =>
          throwIfApplicationBlocked({
            enrollment: standardEnrollment,
            groupId: TARGET_GROUP_ID,
            rejectedAt,
          }),
        ).toThrow(STANDARD_MESSAGE);
      });

      it.each([
        [
          "exactly when the window ends",
          subDays(NOW, STANDARD_REAPPLICATION_DAYS),
        ],
        [
          "1 minute after the window ends",
          subMinutes(subDays(NOW, STANDARD_REAPPLICATION_DAYS), 1),
        ],
        ["90 days ago", subDays(NOW, 90)],
      ])("allows another group when rejected %s", (_label, rejectedAt) => {
        expect(() =>
          throwIfApplicationBlocked({
            enrollment: standardEnrollment,
            groupId: TARGET_GROUP_ID,
            rejectedAt,
          }),
        ).not.toThrow();
      });

      it("treats an enrollment with no group as another group", () => {
        expect(() =>
          throwIfApplicationBlocked({
            enrollment: enrollment(
              ProgramEnrollmentStatus.approved,
              ReapplicationTimeframe.standard,
              null,
            ),
            groupId: TARGET_GROUP_ID,
            rejectedAt: subDays(NOW, 1),
          }),
        ).toThrow(STANDARD_MESSAGE);
      });
    });
  });
});
