import { getSubmittedLeadCommentsToNotify } from "@/lib/submitted-leads/submitted-lead-comment-notifications";
import { describe, expect, it } from "vitest";

const atMinute = (minute: number) => new Date(Date.UTC(2026, 9, 2, 12, minute));
const comment = (minute: number) => ({
  id: `${minute}m`,
  createdAt: atMinute(minute),
});

const idsToNotify = (unsentMinutes: number[], lastCommentMinute: number) =>
  getSubmittedLeadCommentsToNotify({
    unsentComments: unsentMinutes.map(comment),
    lastCommentCreatedAt: atMinute(lastCommentMinute),
  })?.map(({ id }) => id) ?? null;

describe("getSubmittedLeadCommentsToNotify", () => {
  it("returns all unsent comments, oldest first, for the newest comment's job", () => {
    expect(idsToNotify([2, 0], 2)).toEqual(["0m", "2m"]);
  });

  it("skips when an unsent comment is newer than the job's comment", () => {
    expect(idsToNotify([2, 0], 0)).toBeNull();
  });

  it("sends the earlier comment when the newer comment was deleted", () => {
    // A at minute 0, B at minute 2, B deleted before its job runs
    expect(idsToNotify([0], 2)).toEqual(["0m"]);
  });

  it("returns no comments when every comment was already sent", () => {
    expect(idsToNotify([], 2)).toEqual([]);
  });
});
