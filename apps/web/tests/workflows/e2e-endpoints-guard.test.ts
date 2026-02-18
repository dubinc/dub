import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

describe("E2E endpoints workspace guard", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("Allows access from the Acme E2E workspace", async () => {
    const { status } = await http.get<any>({
      path: "/e2e/workflows",
      query: { bountyId: "non-existent" },
    });

    // 200 with null workflow (not found, but auth passed)
    expect(status).toEqual(200);
  });

  test("Rejects access without authentication", async () => {
    const baseUrl = h.baseUrl;

    const response = await fetch(`${baseUrl}/api/e2e/workflows?bountyId=test`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status).toEqual(401);
  });
});
