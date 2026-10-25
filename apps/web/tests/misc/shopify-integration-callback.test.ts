import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "../../app/(ee)/api/shopify/integration/callback/route";
import { shopifyAdminGraphql } from "../../lib/integrations/shopify/admin-graphql";

const mocks = vi.hoisted(() => ({
  updateProject: vi.fn(),
  deleteInstalledIntegration: vi.fn(),
  installIntegration: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  withWorkspace: (handler: unknown) => handler,
}));
vi.mock("@/lib/api/utils", () => ({
  parseRequestBody: (req: Request) => req.json(),
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
vi.mock("@/lib/encryption", () => ({
  encrypt: (value: string) => `encrypted:${value}`,
}));
vi.mock("@/lib/integrations/install", () => ({
  installIntegration: mocks.installIntegration,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { update: mocks.updateProject },
    installedIntegration: { delete: mocks.deleteInstalledIntegration },
  },
}));

// The middleware mock exposes the wrapped callback.
const callback = PATCH as unknown as (ctx: {
  req: Request;
  workspace: { id: string };
  session: { user: { id: string } };
}) => Promise<Response>;

const patch = (body: Record<string, unknown>) =>
  callback({
    req: new Request("http://localhost/api/shopify/integration/callback", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
    workspace: { id: "ws_1" },
    session: { user: { id: "user_1" } },
  });

const connect = (shopifyStoreId: string) =>
  patch({
    action: "connect",
    shopifyStoreId,
    accessToken: "shpat_test",
    scope: "read_orders",
  });

const shopifyReturns = (response: Response) =>
  vi.mocked(fetch).mockResolvedValue(response);

describe("PATCH /api/shopify/integration/callback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    mocks.updateProject.mockImplementation(async ({ data }) => data);
  });

  it.each([
    "evil.com/x?",
    "169.254.169.254",
    "acme.myshopify.com.evil.com",
    "acme-.myshopify.com",
    `${"a".repeat(64)}.myshopify.com`,
  ])(
    "rejects %s without contacting it or saving it",
    async (shopifyStoreId) => {
      await expect(connect(shopifyStoreId)).rejects.toThrow();

      expect(fetch).not.toHaveBeenCalled();
      expect(mocks.updateProject).not.toHaveBeenCalled();
    },
  );

  it("rejects a token Shopify does not accept for the store", async () => {
    shopifyReturns(new Response("Unauthorized", { status: 401 }));

    await expect(connect("acme.myshopify.com")).rejects.toMatchObject({
      code: "forbidden",
    });
    expect(mocks.updateProject).not.toHaveBeenCalled();
  });

  it("rejects a token that belongs to a different store", async () => {
    shopifyReturns(
      Response.json({
        data: { shop: { myshopifyDomain: "attacker.myshopify.com" } },
      }),
    );

    await expect(connect("acme.myshopify.com")).rejects.toMatchObject({
      code: "forbidden",
    });
    expect(mocks.updateProject).not.toHaveBeenCalled();
  });

  it("saves the store when the token belongs to it", async () => {
    shopifyReturns(
      Response.json({
        data: { shop: { myshopifyDomain: "acme.myshopify.com" } },
      }),
    );

    const res = await connect(" Acme.myshopify.com ");

    expect(res.status).toBe(200);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toMatch(
      /^https:\/\/acme\.myshopify\.com\/admin\/api\//,
    );
    expect(mocks.updateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { shopifyStoreId: "acme.myshopify.com" },
      }),
    );
    expect(mocks.installIntegration).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws_1",
        credentials: {
          accessToken: "encrypted:shpat_test",
          scope: "read_orders",
        },
      }),
    );
  });

  it("disconnects without contacting Shopify", async () => {
    const res = await patch({ action: "disconnect", shopifyStoreId: null });

    expect(res.status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.updateProject).toHaveBeenCalledWith(
      expect.objectContaining({ data: { shopifyStoreId: null } }),
    );
    expect(mocks.deleteInstalledIntegration).toHaveBeenCalled();
  });
});

describe("shopifyAdminGraphql", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("does not send requests for an invalid stored store ID", async () => {
    await expect(
      shopifyAdminGraphql({
        shopifyStoreId: "evil.com/x?",
        accessToken: "shpat_test",
        query: "query { shop { id } }",
      }),
    ).rejects.toMatchObject({ code: "invalid_store" });

    expect(fetch).not.toHaveBeenCalled();
  });
});
