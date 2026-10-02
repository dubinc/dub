import { getSubmittedLeadCommentNotificationBatch } from "@/lib/submitted-leads/submitted-lead-comment-notifications";
import { describe, expect, it } from "vitest";

const minutesAgo = (minutes: number) => ({
  id: `${minutes}m`,
  createdAt: new Date(Date.UTC(2026, 9, 2, 12) - minutes * 60 * 1000),
});

describe("getSubmittedLeadCommentNotificationBatch", () => {
  it("returns the comments that were posted less than 3 minutes apart, oldest first", () => {
    const comments = [minutesAgo(0), minutesAgo(2), minutesAgo(4)];

    expect(
      getSubmittedLeadCommentNotificationBatch(comments).map(({ id }) => id),
    ).toEqual(["4m", "2m", "0m"]);
  });

  it("stops at the first gap of 3 minutes or more", () => {
    const comments = [
      minutesAgo(0),
      minutesAgo(1),
      minutesAgo(4),
      minutesAgo(5),
    ];

    expect(
      getSubmittedLeadCommentNotificationBatch(comments).map(({ id }) => id),
    ).toEqual(["1m", "0m"]);
  });

  it("returns only the latest comment when it is alone", () => {
    const comments = [minutesAgo(0), minutesAgo(60)];

    expect(
      getSubmittedLeadCommentNotificationBatch(comments).map(({ id }) => id),
    ).toEqual(["0m"]);
  });
});
