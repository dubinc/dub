import { STRIPE_INTEGRATION_ID } from "@dub/utils";
import type Stripe from "stripe";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { accountApplicationDeauthorized } from "../../app/(ee)/api/stripe/integration/webhook/account-application-deauthorized";

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const tx = {
    project: {
      updateMany: mocks.updateMany,
    },
    installedIntegration: {
      deleteMany: mocks.deleteMany,
    },
  };

  return {
    prisma: {
      $transaction: (fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
    },
  };
});

const event = {} as Stripe.AccountApplicationDeauthorizedEvent;

const workspace = {
  id: "ws_test",
  stripeConnectId: "acct_test",
  defaultProgramId: null,
  webhookEnabled: false,
  environment: "staging" as const,
};

describe("accountApplicationDeauthorized", () => {
  beforeEach(() => {
    mocks.updateMany.mockReset();
    mocks.deleteMany.mockReset();
  });

  test("disconnects the workspace and removes its Stripe installation", async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });

    const result = await accountApplicationDeauthorized({
      event,
      mode: "test",
      workspace,
    });

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: "ws_test",
        stripeConnectId: "acct_test",
      },
      data: {
        stripeConnectId: null,
        stripeConnectMode: null,
      },
    });
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: {
        projectId: "ws_test",
        integrationId: STRIPE_INTEGRATION_ID,
      },
    });
    expect(result.response).toContain("deauthorized for workspace ws_test");
  });

  test("keeps the installation when the workspace is no longer connected to the account", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });

    const result = await accountApplicationDeauthorized({
      event,
      mode: "test",
      workspace,
    });

    expect(mocks.deleteMany).not.toHaveBeenCalled();
    expect(result.response).toContain("no longer connected");
  });

  test("skips non-live deauthorization for production workspaces", async () => {
    const result = await accountApplicationDeauthorized({
      event,
      mode: "test",
      workspace: { ...workspace, environment: "production" },
    });

    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.deleteMany).not.toHaveBeenCalled();
    expect(result.response).toContain("Skipping");
  });
});
