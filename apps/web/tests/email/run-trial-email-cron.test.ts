import { runTrialEmailCron } from "@/lib/email/run-trial-email-cron";
import {
  getTrialEmailSubject,
  TRIAL_EMAIL_TYPE,
} from "@/lib/email/trial-email-schedule";
import { describe, expect, it, vi } from "vitest";

const TRIAL_ENDS_AT = new Date(Date.UTC(2025, 0, 15, 23, 59, 59));

describe("runTrialEmailCron", () => {
  const workspaceId = "ws_trial_test";
  const slug = "acme";

  const baseWorkspace = {
    id: workspaceId,
    slug,
    plan: "business",
    trialEndsAt: TRIAL_ENDS_AT,
    sentEmails: [] as { type: string }[],
    users: [
      { user: { email: "owner@test.com", name: "Owner" } },
    ] as const,
  };

  it("returns zeros and does not send when no workspaces match", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const create = vi.fn();
    const sendEmail = vi.fn();
    const now = new Date(Date.UTC(2025, 0, 1, 10, 0, 0));

    const result = await runTrialEmailCron({
      now,
      prisma: { project: { findMany }, sentEmail: { create } },
      sendEmail,
    });

    expect(result).toEqual({ sentCount: 0, workspaceCount: 0 });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("sends due email and creates SentEmail row", async () => {
    const findMany = vi.fn().mockResolvedValue([{ ...baseWorkspace }]);
    const create = vi.fn().mockResolvedValue({ id: "se_1" });
    const sendEmail = vi.fn().mockResolvedValue(undefined);
    const now = new Date(Date.UTC(2025, 0, 1, 10, 0, 0));

    const result = await runTrialEmailCron({
      now,
      prisma: { project: { findMany }, sentEmail: { create } },
      sendEmail,
    });

    expect(result).toEqual({ sentCount: 1, workspaceCount: 1 });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0]?.[0]).toMatchObject({
      to: "owner@test.com",
      subject: getTrialEmailSubject(TRIAL_EMAIL_TYPE.STARTED),
      replyTo: "steven.tey@dub.co",
      variant: "marketing",
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        projectId: workspaceId,
        type: TRIAL_EMAIL_TYPE.STARTED,
      },
    });
  });

  it("does not send when that type was already sent", async () => {
    const findMany = vi
      .fn()
      .mockResolvedValue([
        {
          ...baseWorkspace,
          sentEmails: [{ type: TRIAL_EMAIL_TYPE.STARTED }],
        },
      ]);
    const create = vi.fn();
    const sendEmail = vi.fn();
    const now = new Date(Date.UTC(2025, 0, 1, 10, 0, 0));

    const result = await runTrialEmailCron({
      now,
      prisma: { project: { findMany }, sentEmail: { create } },
      sendEmail,
    });

    expect(result).toEqual({ sentCount: 0, workspaceCount: 1 });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("skips workspace when owner has no email", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        ...baseWorkspace,
        users: [{ user: { email: null, name: "Owner" } }],
      },
    ]);
    const create = vi.fn();
    const sendEmail = vi.fn();
    const now = new Date(Date.UTC(2025, 0, 1, 10, 0, 0));

    const result = await runTrialEmailCron({
      now,
      prisma: { project: { findMany }, sentEmail: { create } },
      sendEmail,
    });

    expect(result).toEqual({ sentCount: 0, workspaceCount: 1 });
    expect(sendEmail).not.toHaveBeenCalled();
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
    const sendEmail = vi.fn();
    const now = new Date(Date.UTC(2025, 0, 1, 10, 0, 0));

    const result = await runTrialEmailCron({
      now,
      prisma: { project: { findMany }, sentEmail: { create } },
      sendEmail,
    });

    expect(result).toEqual({ sentCount: 0, workspaceCount: 1 });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
