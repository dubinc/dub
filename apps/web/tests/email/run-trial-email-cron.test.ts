import { runTrialEmailCron } from "@/lib/email/run-trial-email-cron";
import {
  getTrialEmailSubject,
  TRIAL_EMAIL_TYPE,
} from "@/lib/email/trial-email-schedule";
import { describe, expect, it, vi } from "vitest";

const TRIAL_ENDS_AT = new Date(Date.UTC(2025, 0, 8, 23, 59, 59));

describe("runTrialEmailCron", () => {
  const workspaceId = "ws_trial_test";
  const slug = "acme";

  const baseWorkspace = {
    id: workspaceId,
    name: "Acme",
    slug,
    plan: "business",
    trialEndsAt: TRIAL_ENDS_AT,
    sentEmails: [] as { type: string }[],
    users: [{ user: { email: "owner@test.com", name: "Owner" } }] as const,
  };

  const batchOk = { data: null as null, error: null as null };

  it("returns zeros and does not send when no workspaces match", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const create = vi.fn();
    const sendBatchEmail = vi.fn();
    const now = new Date(Date.UTC(2025, 0, 1, 10, 0, 0));

    const result = await runTrialEmailCron({
      now,
      prisma: { project: { findMany }, sentEmail: { create } },
      sendBatchEmail,
    });

    expect(result).toEqual({
      sentCount: 0,
      workspaceCount: 0,
      hasMore: false,
    });
    expect(sendBatchEmail).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("sends due email to all recipients via sendBatchEmail and creates one SentEmail row", async () => {
    const findMany = vi.fn().mockResolvedValue([{ ...baseWorkspace }]);
    const create = vi.fn().mockResolvedValue({ id: "se_1" });
    const sendBatchEmail = vi.fn().mockResolvedValue(batchOk);
    const now = new Date(Date.UTC(2025, 0, 1, 10, 0, 0));

    const result = await runTrialEmailCron({
      now,
      prisma: { project: { findMany }, sentEmail: { create } },
      sendBatchEmail,
    });

    expect(result).toEqual({
      sentCount: 1,
      workspaceCount: 1,
      hasMore: false,
    });
    expect(sendBatchEmail).toHaveBeenCalledTimes(1);
    const firstBatch = sendBatchEmail.mock.calls[0]?.[0] as {
      to: string;
      subject: string;
      replyTo: string;
      variant: string;
    }[];
    expect(firstBatch).toHaveLength(1);
    expect(firstBatch?.[0]).toMatchObject({
      to: "owner@test.com",
      subject: getTrialEmailSubject({
        type: TRIAL_EMAIL_TYPE.SEVEN_DAYS_REMAINING,
        companyName: "Acme",
      }),
      replyTo: "steven.tey@dub.co",
      variant: "marketing",
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        projectId: workspaceId,
        type: TRIAL_EMAIL_TYPE.SEVEN_DAYS_REMAINING,
      },
    });
  });

  it("sends one batched payload per due type when multiple workspace members have email", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        ...baseWorkspace,
        users: [
          { user: { email: "owner@test.com", name: "Owner" } },
          { user: { email: "member@test.com", name: "Member" } },
        ],
      },
    ]);
    const create = vi.fn().mockResolvedValue({ id: "se_1" });
    const sendBatchEmail = vi.fn().mockResolvedValue(batchOk);
    const now = new Date(Date.UTC(2025, 0, 1, 10, 0, 0));

    const result = await runTrialEmailCron({
      now,
      prisma: { project: { findMany }, sentEmail: { create } },
      sendBatchEmail,
    });

    expect(result.sentCount).toBe(2);
    expect(sendBatchEmail).toHaveBeenCalledTimes(1);
    const batch = sendBatchEmail.mock.calls[0]?.[0] as { to: string }[];
    expect(batch).toHaveLength(2);
    expect(batch.map((b) => b.to).sort()).toEqual([
      "member@test.com",
      "owner@test.com",
    ]);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("does not send when that type was already sent", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        ...baseWorkspace,
        sentEmails: [{ type: TRIAL_EMAIL_TYPE.SEVEN_DAYS_REMAINING }],
      },
    ]);
    const create = vi.fn();
    const sendBatchEmail = vi.fn();
    const now = new Date(Date.UTC(2025, 0, 1, 10, 0, 0));

    const result = await runTrialEmailCron({
      now,
      prisma: { project: { findMany }, sentEmail: { create } },
      sendBatchEmail,
    });

    expect(result).toEqual({
      sentCount: 0,
      workspaceCount: 1,
      hasMore: false,
    });
    expect(sendBatchEmail).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("skips sending when no user has an email", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        ...baseWorkspace,
        users: [{ user: { email: null, name: "Owner" } }],
      },
    ]);
    const create = vi.fn();
    const sendBatchEmail = vi.fn();
    const now = new Date(Date.UTC(2025, 0, 1, 10, 0, 0));

    const result = await runTrialEmailCron({
      now,
      prisma: { project: { findMany }, sentEmail: { create } },
      sendBatchEmail,
    });

    expect(result).toEqual({
      sentCount: 0,
      workspaceCount: 1,
      hasMore: false,
    });
    expect(sendBatchEmail).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("skips workspace when trialEndsAt is null", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        ...baseWorkspace,
        trialEndsAt: null,
      },
    ]);
    const create = vi.fn();
    const sendBatchEmail = vi.fn();
    const now = new Date(Date.UTC(2025, 0, 1, 10, 0, 0));

    const result = await runTrialEmailCron({
      now,
      prisma: { project: { findMany }, sentEmail: { create } },
      sendBatchEmail,
    });

    expect(result).toEqual({
      sentCount: 0,
      workspaceCount: 1,
      hasMore: false,
    });
    expect(sendBatchEmail).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("sets hasMore and nextStartingAfter when page is full", async () => {
    const workspaces = Array.from({ length: 50 }, (_, i) => ({
      ...baseWorkspace,
      id: `ws_${i}`,
      slug: `slug-${i}`,
    }));
    const findMany = vi.fn().mockResolvedValue(workspaces);
    const create = vi.fn();
    const sendBatchEmail = vi.fn().mockResolvedValue(batchOk);
    const now = new Date(Date.UTC(2025, 0, 1, 10, 0, 0));

    const result = await runTrialEmailCron({
      now,
      prisma: { project: { findMany }, sentEmail: { create } },
      sendBatchEmail,
    });

    expect(result.workspaceCount).toBe(50);
    expect(result.hasMore).toBe(true);
    expect(result.nextStartingAfter).toBe("ws_49");
  });

  it("passes cursor to findMany when startingAfter is set", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const create = vi.fn();
    const sendBatchEmail = vi.fn();
    const now = new Date(Date.UTC(2025, 0, 1, 10, 0, 0));

    await runTrialEmailCron({
      now,
      prisma: { project: { findMany }, sentEmail: { create } },
      sendBatchEmail,
      startingAfter: "ws_prev",
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1,
        cursor: { id: "ws_prev" },
        take: 50,
      }),
    );
  });
});
