import { beforeEach, describe, expect, test, vi } from "vitest";
import { getWorkspaceForStripeAccount } from "../../app/(ee)/api/stripe/integration/webhook/utils/get-workspace-for-stripe-account";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findMany: mocks.findMany,
    },
  },
}));

const stripeAccountId = "acct_test";

const liveWorkspace = {
  id: "ws_live",
  stripeConnectId: stripeAccountId,
  stripeConnectMode: "live",
  defaultProgramId: null,
  webhookEnabled: false,
  environment: "production",
};

const testWorkspace = {
  ...liveWorkspace,
  id: "ws_test",
  stripeConnectMode: "test",
  environment: "staging",
};

describe("getWorkspaceForStripeAccount", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
  });

  test("returns the workspace connected in the event's mode", async () => {
    mocks.findMany.mockResolvedValue([liveWorkspace, testWorkspace]);

    await expect(
      getWorkspaceForStripeAccount({ stripeAccountId, mode: "live" }),
    ).resolves.toBe(liveWorkspace);
    await expect(
      getWorkspaceForStripeAccount({ stripeAccountId, mode: "test" }),
    ).resolves.toBe(testWorkspace);

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          stripeConnectId: stripeAccountId,
        },
      }),
    );
  });

  test("falls back to the only workspace connected to the account", async () => {
    mocks.findMany.mockResolvedValue([liveWorkspace]);

    await expect(
      getWorkspaceForStripeAccount({ stripeAccountId, mode: "test" }),
    ).resolves.toBe(liveWorkspace);
  });

  test("returns null when several workspaces share the account and none match the mode", async () => {
    mocks.findMany.mockResolvedValue([liveWorkspace, testWorkspace]);

    await expect(
      getWorkspaceForStripeAccount({ stripeAccountId, mode: "sandbox" }),
    ).resolves.toBeNull();
  });

  test("returns null when no workspace is connected to the account", async () => {
    mocks.findMany.mockResolvedValue([]);

    await expect(
      getWorkspaceForStripeAccount({ stripeAccountId, mode: "live" }),
    ).resolves.toBeNull();
  });
});
