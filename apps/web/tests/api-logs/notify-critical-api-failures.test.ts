import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redisSet: vi.fn(),
  redisDel: vi.fn(),
  getWorkspaceUsers: vi.fn(),
  sendBatchEmail: vi.fn(),
  CriticalApiFailed: vi.fn((props: unknown) => props),
}));

vi.mock("@/lib/upstash", () => ({
  redis: {
    set: mocks.redisSet,
    del: mocks.redisDel,
  },
}));

vi.mock("@/lib/api/get-workspace-users", () => ({
  getWorkspaceUsers: mocks.getWorkspaceUsers,
}));

vi.mock("@dub/email", () => ({
  sendBatchEmail: mocks.sendBatchEmail,
}));

vi.mock("@dub/email/templates/critical-api-failed", () => ({
  default: mocks.CriticalApiFailed,
}));

import { CRITICAL_API_ALERT_COOLDOWN_SECONDS } from "@/lib/api-logs/constants";
import { notifyCriticalApiFailures } from "@/lib/api-logs/notify-critical-api-failures";
import { WorkspaceRole } from "@prisma/client";
import { ACME_WORKSPACE_ID } from "@dub/utils";

// Acme seed workspace (apps/web/scripts/dev/data.json)
const ACME_OWNER_EMAIL = "owner@dub-internal-test.com";
const HOUR = new Date(Date.UTC(2026, 9, 16, 14, 0, 0));
const COOLDOWN_OPTS = {
  nx: true,
  ex: CRITICAL_API_ALERT_COOLDOWN_SECONDS,
} as const;

function cooldownKey({
  workspaceId,
  method,
  routePattern,
}: {
  workspaceId: string;
  method: string;
  routePattern: string;
}) {
  return `critical-api-failure-alert:${workspaceId}:${method}:${routePattern}`;
}

function getSentBatch(callIndex = 0) {
  return mocks.sendBatchEmail.mock.calls[callIndex]?.[0] as {
    to: string;
    subject: string;
    variant: string;
  }[];
}

function getEmailFailures() {
  return (
    mocks.CriticalApiFailed.mock.calls[0]?.[0] as {
      failures: {
        method: string;
        routePattern: string;
        statusCode: number;
        failureCount: number;
      }[];
    }
  )?.failures;
}

// Simulates Redis NX cooldown: first claim succeeds, later claims for the same key fail.
function mockIndependentEndpointCooldowns() {
  const claimedKeys = new Set<string>();

  mocks.redisSet.mockImplementation(async (key: string) => {
    if (claimedKeys.has(key)) {
      return null;
    }
    claimedKeys.add(key);
    return "OK";
  });
}

describe("notifyCriticalApiFailures", () => {
  const acmeWorkspace = {
    id: ACME_WORKSPACE_ID,
    name: "Acme, Inc.",
    slug: "acme",
    program: null,
    users: [
      {
        id: "user_cludszk1h0000wmd2e0ea2b0p",
        name: "Owner",
        email: ACME_OWNER_EMAIL,
      },
    ],
  };

  const lead403 = {
    workspaceId: ACME_WORKSPACE_ID,
    method: "POST",
    routePattern: "/track/lead",
    statusCode: 403,
    failureCount: 5,
  };

  const sale401 = {
    workspaceId: ACME_WORKSPACE_ID,
    method: "POST",
    routePattern: "/track/sale",
    statusCode: 401,
    failureCount: 3,
  };

  const leadCooldownKey = cooldownKey({
    workspaceId: ACME_WORKSPACE_ID,
    method: lead403.method,
    routePattern: lead403.routePattern,
  });

  const saleCooldownKey = cooldownKey({
    workspaceId: ACME_WORKSPACE_ID,
    method: sale401.method,
    routePattern: sale401.routePattern,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redisSet.mockResolvedValue("OK");
    mocks.redisDel.mockResolvedValue(1);
    mocks.getWorkspaceUsers.mockResolvedValue(acmeWorkspace);
    mocks.sendBatchEmail.mockResolvedValue({ data: null, error: null });
  });

  it("returns zeros and does not send when there are no failure rows", async () => {
    const result = await notifyCriticalApiFailures({ hour: HOUR, rows: [] });

    expect(result).toEqual({ workspacesNotified: 0, emailsQueued: 0 });
    expect(mocks.redisSet).not.toHaveBeenCalled();
    expect(mocks.sendBatchEmail).not.toHaveBeenCalled();
  });

  it("sends email when failures are present and cooldown is acquired", async () => {
    const result = await notifyCriticalApiFailures({
      hour: HOUR,
      rows: [lead403],
    });

    expect(result).toEqual({ workspacesNotified: 1, emailsQueued: 1 });
    expect(mocks.redisSet).toHaveBeenCalledWith(
      leadCooldownKey,
      "1",
      COOLDOWN_OPTS,
    );
    expect(mocks.getWorkspaceUsers).toHaveBeenCalledWith({
      workspaceId: ACME_WORKSPACE_ID,
      role: WorkspaceRole.owner,
    });
    expect(mocks.sendBatchEmail).toHaveBeenCalledTimes(1);

    const batch = getSentBatch();
    expect(batch).toHaveLength(1);
    expect(batch[0]).toMatchObject({
      to: ACME_OWNER_EMAIL,
      variant: "notifications",
      subject: "Your API requests to POST /track/lead are failing",
    });
    expect(mocks.CriticalApiFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        email: ACME_OWNER_EMAIL,
        workspace: { name: "Acme, Inc.", slug: "acme" },
        failures: [
          expect.objectContaining({
            method: "POST",
            routePattern: "/track/lead",
            statusCode: 403,
            failureCount: 5,
          }),
        ],
        hourLabel: "Oct 16, 2026, 14:00–15:00 UTC",
      }),
    );
    expect(mocks.redisDel).not.toHaveBeenCalled();
  });

  it("uses a multi-endpoint subject when more than one endpoint fails", async () => {
    await notifyCriticalApiFailures({
      hour: HOUR,
      rows: [lead403, sale401],
    });

    expect(getSentBatch()[0]?.subject).toBe(
      "Critical API endpoints are failing in Acme, Inc.",
    );
    expect(mocks.redisSet).toHaveBeenCalledTimes(2);
    expect(mocks.redisSet).toHaveBeenCalledWith(
      leadCooldownKey,
      "1",
      COOLDOWN_OPTS,
    );
    expect(mocks.redisSet).toHaveBeenCalledWith(
      saleCooldownKey,
      "1",
      COOLDOWN_OPTS,
    );
  });

  it("skips sending when the endpoint cooldown key is already set", async () => {
    mocks.redisSet.mockResolvedValue(null);

    const result = await notifyCriticalApiFailures({
      hour: HOUR,
      rows: [lead403],
    });

    expect(result).toEqual({ workspacesNotified: 0, emailsQueued: 0 });
    expect(mocks.getWorkspaceUsers).not.toHaveBeenCalled();
    expect(mocks.sendBatchEmail).not.toHaveBeenCalled();
    expect(mocks.redisDel).not.toHaveBeenCalled();
  });

  it("after alerting for /track/lead, a later call with only /track/sale still sends", async () => {
    mockIndependentEndpointCooldowns();

    const first = await notifyCriticalApiFailures({
      hour: HOUR,
      rows: [lead403],
    });
    const second = await notifyCriticalApiFailures({
      hour: HOUR,
      rows: [sale401],
    });

    expect(first).toEqual({ workspacesNotified: 1, emailsQueued: 1 });
    expect(second).toEqual({ workspacesNotified: 1, emailsQueued: 1 });
    expect(mocks.sendBatchEmail).toHaveBeenCalledTimes(2);
    expect(getSentBatch(1)[0]?.subject).toBe(
      "Your API requests to POST /track/sale are failing",
    );
  });

  it("re-alerting the same method+route within cooldown is skipped", async () => {
    mockIndependentEndpointCooldowns();

    const first = await notifyCriticalApiFailures({
      hour: HOUR,
      rows: [lead403],
    });
    const second = await notifyCriticalApiFailures({
      hour: HOUR,
      rows: [lead403],
    });

    expect(first).toEqual({ workspacesNotified: 1, emailsQueued: 1 });
    expect(second).toEqual({ workspacesNotified: 0, emailsQueued: 0 });
    expect(mocks.sendBatchEmail).toHaveBeenCalledTimes(1);
  });

  it("releases claimed endpoint cooldowns when sendBatchEmail returns an error", async () => {
    mocks.sendBatchEmail.mockResolvedValue({
      data: null,
      error: { message: "SMTP failed" },
    });

    const result = await notifyCriticalApiFailures({
      hour: HOUR,
      rows: [lead403, sale401],
    });

    expect(result).toEqual({ workspacesNotified: 0, emailsQueued: 0 });
    expect(mocks.redisDel).toHaveBeenCalledTimes(2);
    expect(mocks.redisDel).toHaveBeenCalledWith(leadCooldownKey);
    expect(mocks.redisDel).toHaveBeenCalledWith(saleCooldownKey);
  });

  it("keeps the highest failureCount per method+route across status codes", async () => {
    await notifyCriticalApiFailures({
      hour: HOUR,
      rows: [
        { ...lead403, statusCode: 401, failureCount: 3 },
        { ...lead403, statusCode: 403, failureCount: 8 },
        sale401,
      ],
    });

    const failures = getEmailFailures();

    expect(failures).toHaveLength(2);
    expect(failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: "POST",
          routePattern: "/track/lead",
          statusCode: 403,
          failureCount: 8,
        }),
        expect.objectContaining({
          method: "POST",
          routePattern: "/track/sale",
          statusCode: 401,
          failureCount: 3,
        }),
      ]),
    );
  });

  it("emails every workspace owner and counts emailsQueued", async () => {
    mocks.getWorkspaceUsers.mockResolvedValue({
      ...acmeWorkspace,
      users: [
        ...acmeWorkspace.users,
        {
          id: "user_owner_2",
          name: "Co-owner",
          email: "coowner@dub-internal-test.com",
        },
      ],
    });

    const result = await notifyCriticalApiFailures({
      hour: HOUR,
      rows: [lead403],
    });

    expect(result).toEqual({ workspacesNotified: 1, emailsQueued: 2 });
    expect(getSentBatch().map((email) => email.to).sort()).toEqual([
      "coowner@dub-internal-test.com",
      ACME_OWNER_EMAIL,
    ]);
  });

  it("skips a workspace with no owners without sending", async () => {
    mocks.getWorkspaceUsers.mockResolvedValue({
      ...acmeWorkspace,
      users: [],
    });

    const result = await notifyCriticalApiFailures({
      hour: HOUR,
      rows: [lead403],
    });

    expect(result).toEqual({ workspacesNotified: 0, emailsQueued: 0 });
    expect(mocks.sendBatchEmail).not.toHaveBeenCalled();
  });

  it("continues when getWorkspaceUsers throws", async () => {
    mocks.getWorkspaceUsers.mockRejectedValue(new Error("Workspace not found"));

    const result = await notifyCriticalApiFailures({
      hour: HOUR,
      rows: [lead403],
    });

    expect(result).toEqual({ workspacesNotified: 0, emailsQueued: 0 });
    expect(mocks.sendBatchEmail).not.toHaveBeenCalled();
    expect(mocks.redisDel).not.toHaveBeenCalled();
  });

  it("notifies each workspace independently when cooldown differs", async () => {
    const otherWorkspaceId = "ws_other_test";

    mocks.redisSet.mockImplementation(async (key: string) =>
      key.includes(otherWorkspaceId) ? null : "OK",
    );
    mocks.getWorkspaceUsers.mockImplementation(
      async ({ workspaceId }: { workspaceId: string }) => {
        if (workspaceId === ACME_WORKSPACE_ID) {
          return acmeWorkspace;
        }

        return {
          id: otherWorkspaceId,
          name: "Other",
          slug: "other",
          program: null,
          users: [{ id: "u2", name: "Owner", email: "other@test.com" }],
        };
      },
    );

    const result = await notifyCriticalApiFailures({
      hour: HOUR,
      rows: [
        lead403,
        {
          workspaceId: otherWorkspaceId,
          method: "POST",
          routePattern: "/track/sale",
          statusCode: 403,
          failureCount: 4,
        },
      ],
    });

    expect(result).toEqual({ workspacesNotified: 1, emailsQueued: 1 });
    expect(mocks.sendBatchEmail).toHaveBeenCalledTimes(1);
    expect(getSentBatch()[0]?.to).toBe(ACME_OWNER_EMAIL);
  });

  it("batches newly claimed endpoints into one email and skips those on cooldown", async () => {
    mocks.redisSet.mockImplementation(async (key: string) =>
      key === leadCooldownKey ? null : "OK",
    );

    await notifyCriticalApiFailures({
      hour: HOUR,
      rows: [lead403, sale401],
    });

    expect(mocks.sendBatchEmail).toHaveBeenCalledTimes(1);
    expect(getSentBatch()[0]?.subject).toBe(
      "Your API requests to POST /track/sale are failing",
    );
    expect(getEmailFailures()).toEqual([
      expect.objectContaining({ routePattern: "/track/sale" }),
    ]);
  });
});
