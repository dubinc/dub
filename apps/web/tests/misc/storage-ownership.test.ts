import { R2_URL } from "@dub/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DELETE as deleteCustomerRoute,
  PATCH as updateCustomerRoute,
} from "../../app/(ee)/api/customers/[id]/route";
import { POST as createCustomerRoute } from "../../app/(ee)/api/customers/route";
import { PATCH as updateOAuthAppRoute } from "../../app/api/oauth/apps/[appId]/route";

// Regression tests for the cross-tenant storage deletion report: a tenant
// plants another tenant's well-formed R2 URL in a column they own, then
// triggers a delete. Storage must never touch the other tenant's object.

const mocks = vi.hoisted(() => ({
  storageUpload: vi.fn(),
  storageDelete: vi.fn(),
  getCustomer: vi.fn(),
  customerCreate: vi.fn(),
  customerUpdate: vi.fn(),
  customerDelete: vi.fn(),
  integrationFind: vi.fn(),
  integrationUpdate: vi.fn(),
  pending: [] as Promise<unknown>[],
}));

vi.mock("@/lib/api/errors", () => ({
  DubApiError: class extends Error {
    code: string;
    constructor({ code, message }: { code: string; message: string }) {
      super(message);
      this.code = code;
    }
  },
}));
vi.mock("@/lib/auth", () => ({
  withWorkspace: (handler: unknown) => handler,
  hashToken: vi.fn(),
}));
vi.mock("@vercel/functions", () => ({
  waitUntil: (promise: Promise<unknown>) => {
    mocks.pending.push(promise);
  },
}));
vi.mock("@/lib/storage", () => ({
  storage: {
    upload: mocks.storageUpload,
    delete: mocks.storageDelete,
  },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      create: mocks.customerCreate,
      update: mocks.customerUpdate,
      delete: mocks.customerDelete,
    },
    integration: {
      findUniqueOrThrow: mocks.integrationFind,
      update: mocks.integrationUpdate,
    },
  },
}));
vi.mock("@/lib/api/customers/get-customer-or-throw", () => ({
  getCustomerOrThrow: mocks.getCustomer,
}));
vi.mock("@/lib/api/customers/transform-customer", () => ({
  transformCustomer: (customer: unknown) => customer,
}));
vi.mock("@/lib/zod/schemas/customers", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/zod/schemas/customers")>();
  const passthrough = { parse: (value: unknown) => value };
  return {
    ...actual,
    CustomerSchema: passthrough,
    CustomerEnrichedSchema: passthrough,
  };
});
vi.mock("@/lib/zod/schemas/oauth", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/zod/schemas/oauth")>();
  return {
    ...actual,
    oAuthAppSchema: { parse: (value: unknown) => value },
  };
});

type Handler = (ctx: Record<string, unknown>) => Promise<Response>;
const createCustomer = createCustomerRoute as unknown as Handler;
const updateCustomer = updateCustomerRoute as unknown as Handler;
const deleteCustomer = deleteCustomerRoute as unknown as Handler;
const updateOAuthApp = updateOAuthAppRoute as unknown as Handler;

const attackerWorkspace = {
  id: "ws_attacker",
  stripeConnectId: null,
};
const victimLogo = `${R2_URL}/workspaces/ws_victim/logo_oOYy56p`;
const victimLogoKey = "workspaces/ws_victim/logo_oOYy56p";

const jsonRequest = (body: unknown) =>
  new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify(body),
  });

const flushBackgroundWork = async () => {
  await Promise.allSettled(mocks.pending.splice(0));
};

const deletedKeys = () =>
  mocks.storageDelete.mock.calls.map(([{ key }]) => key);

beforeEach(() => {
  vi.resetAllMocks();
  mocks.pending.length = 0;
  mocks.storageUpload.mockImplementation(async ({ key }) => ({
    url: `${R2_URL}/${key}`,
  }));
  mocks.storageDelete.mockResolvedValue(undefined);
  mocks.customerCreate.mockImplementation(async ({ data }) => data);
  mocks.customerUpdate.mockImplementation(async ({ data }) => data);
  mocks.customerDelete.mockResolvedValue(undefined);
});

describe("customer avatars", () => {
  it("POST never stores another tenant's URL as the avatar", async () => {
    await createCustomer({
      req: jsonRequest({
        externalId: "ext_1",
        country: "US",
        avatar: victimLogo,
      }),
      workspace: attackerWorkspace,
    });
    await flushBackgroundWork();

    const { data } = mocks.customerCreate.mock.calls[0][0];
    expect(data.avatar).not.toBe(victimLogo);
    expect(data.avatar).toMatch(
      new RegExp(`^${R2_URL}/customers/${data.id}/avatar_[A-Za-z0-9]{7}$`),
    );

    // The victim's image is copied into the customer's own key
    expect(mocks.storageUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        key: data.avatar.replace(`${R2_URL}/`, ""),
        body: victimLogo,
      }),
    );
    expect(mocks.storageDelete).not.toHaveBeenCalled();
  });

  it("DELETE skips an avatar planted before the fix", async () => {
    mocks.getCustomer.mockResolvedValue({
      id: "cus_attacker",
      avatar: victimLogo,
    });

    await deleteCustomer({
      workspace: attackerWorkspace,
      params: { id: "cus_attacker" },
    });

    expect(mocks.customerDelete).toHaveBeenCalled();
    expect(mocks.storageDelete).not.toHaveBeenCalled();
  });

  it("DELETE still removes the customer's own avatar", async () => {
    mocks.getCustomer.mockResolvedValue({
      id: "cus_1",
      avatar: `${R2_URL}/customers/cus_1/avatar_abc1234`,
    });

    await deleteCustomer({
      workspace: attackerWorkspace,
      params: { id: "cus_1" },
    });

    expect(deletedKeys()).toEqual(["customers/cus_1/avatar_abc1234"]);
  });

  it("PATCH copies a foreign URL and never deletes a planted old avatar", async () => {
    mocks.getCustomer.mockResolvedValue({
      id: "cus_attacker",
      avatar: victimLogo,
    });

    await updateCustomer({
      req: jsonRequest({
        avatar: "https://example.com/new.png",
      }),
      workspace: attackerWorkspace,
      params: { id: "cus_attacker" },
      searchParams: {},
    });
    await flushBackgroundWork();

    expect(mocks.storageUpload).toHaveBeenCalledTimes(1);
    expect(deletedKeys()).not.toContain(victimLogoKey);
    expect(mocks.storageDelete).not.toHaveBeenCalled();
  });

  it("PATCH replaces and deletes the customer's own old avatar", async () => {
    mocks.getCustomer.mockResolvedValue({
      id: "cus_1",
      avatar: `${R2_URL}/customers/cus_1/avatar_old1234`,
    });

    await updateCustomer({
      req: jsonRequest({
        avatar: victimLogo,
      }),
      workspace: attackerWorkspace,
      params: { id: "cus_1" },
      searchParams: {},
    });
    await flushBackgroundWork();

    const { data } = mocks.customerUpdate.mock.calls[0][0];
    expect(data.avatar).toMatch(
      new RegExp(`^${R2_URL}/customers/cus_1/avatar_[A-Za-z0-9]{7}$`),
    );
    expect(deletedKeys()).toEqual(["customers/cus_1/avatar_old1234"]);
  });
});

describe("OAuth app screenshots", () => {
  const victimScreenshot = `${R2_URL}/integration-screenshots/ws_victim/abc1234`;
  const legacyScreenshot = `${R2_URL}/integration-screenshots/abc1234`;
  const ownScreenshot = `${R2_URL}/integration-screenshots/ws_attacker/own1234`;

  const patch = (screenshots: string[]) =>
    updateOAuthApp({
      req: jsonRequest({
        screenshots,
      }),
      workspace: attackerWorkspace,
      params: { appId: "int_attacker" },
    });

  beforeEach(() => {
    mocks.integrationUpdate.mockImplementation(async ({ data }) => ({
      ...data,
      oAuthApp: {},
    }));
  });

  it("rejects saving another workspace's screenshot", async () => {
    mocks.integrationFind.mockResolvedValue({
      logo: null,
      screenshots: [],
    });

    await expect(patch([victimScreenshot])).rejects.toMatchObject({
      code: "bad_request",
    });
    expect(mocks.integrationUpdate).not.toHaveBeenCalled();
    expect(mocks.storageDelete).not.toHaveBeenCalled();
  });

  it("never deletes planted or legacy screenshots when they are removed", async () => {
    mocks.integrationFind.mockResolvedValue({
      logo: null,
      screenshots: [victimScreenshot, legacyScreenshot, ownScreenshot],
    });

    await patch([]);
    await flushBackgroundWork();

    expect(deletedKeys()).toEqual([
      "integration-screenshots/ws_attacker/own1234",
    ]);
  });

  it("keeps screenshots already saved on the app", async () => {
    mocks.integrationFind.mockResolvedValue({
      logo: null,
      screenshots: [legacyScreenshot],
    });

    await patch([legacyScreenshot]);
    await flushBackgroundWork();

    expect(mocks.integrationUpdate).toHaveBeenCalled();
    expect(mocks.storageDelete).not.toHaveBeenCalled();
  });
});
