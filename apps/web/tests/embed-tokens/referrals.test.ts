import { generateRandomName } from "@/lib/names";
import { describe, expect, test } from "vitest";
import { randomEmail, randomId } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_PARTNER } from "../utils/resource";

const expectedTokenResponse = {
  publicToken: expect.stringMatching(/^dub_embed_/),
  expires: expect.any(String),
};

describe.sequential("POST /api/tokens/embed/referrals", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  let createdPartnerTenantId: string;

  test("with existing partnerId", async () => {
    const { data, status } = await http.post({
      path: "/tokens/embed/referrals",
      body: {
        partnerId: E2E_PARTNER.id,
      },
    });

    expect(status).toEqual(201);
    expect(data).toStrictEqual(expectedTokenResponse);
  });

  test("with new partner props (creates new partner)", async () => {
    const partner = {
      name: generateRandomName(),
      email: randomEmail(),
      description: "A test partner for embed token",
      country: "US",
      image: "https://api.dicebear.com/9.x/micah/png?seed=test",
      tenantId: randomId(),
    };

    const { data, status } = await http.post({
      path: "/tokens/embed/referrals",
      body: {
        partner,
      },
    });

    expect(status).toEqual(201);
    expect(data).toStrictEqual(expectedTokenResponse);

    // Store the tenantId for use in the next test
    createdPartnerTenantId = partner.tenantId;
  });

  test("with existing tenantId (from created partner)", async () => {
    // Use the tenantId from the partner created in the previous test
    const { data, status } = await http.post({
      path: "/tokens/embed/referrals",
      body: {
        tenantId: createdPartnerTenantId,
      },
    });

    expect(status).toEqual(201);
    expect(data).toStrictEqual(expectedTokenResponse);
  });

  test("with minimal partner props", async () => {
    const partner = {
      email: randomEmail(),
    };

    const { data, status } = await http.post({
      path: "/tokens/embed/referrals",
      body: {
        partner,
      },
    });

    expect(status).toEqual(201);
    expect(data).toStrictEqual(expectedTokenResponse);
  });

  test("fails with no partnerId, tenantId, or partner", async () => {
    const { data, status } = await http.post({
      path: "/tokens/embed/referrals",
      body: {},
    });

    expect(status).toEqual(422);
    expect(data).toMatchObject({
      error: {
        message: expect.stringContaining(
          "You must provide either partnerId, tenantId, or partner",
        ),
      },
    });
  });

  test("fails with non-existent partnerId", async () => {
    const { data, status } = await http.post({
      path: "/tokens/embed/referrals",
      body: {
        partnerId: "pn_nonexistent",
      },
    });

    expect(status).toEqual(404);
    expect(data).toMatchObject({
      error: {
        message: "The partner is not enrolled in this program.",
        code: "not_found",
      },
    });
  });

  test("fails with non-existent tenantId", async () => {
    const { data, status } = await http.post({
      path: "/tokens/embed/referrals",
      body: {
        tenantId: "nonexistent-tenant-id",
      },
    });

    expect(status).toEqual(404);
    expect(data).toMatchObject({
      error: {
        message: "The partner is not enrolled in this program.",
        code: "not_found",
      },
    });
  });

  test("fails with invalid partner email", async () => {
    const { data, status } = await http.post({
      path: "/tokens/embed/referrals",
      body: {
        partner: {
          email: "invalid-email",
        },
      },
    });

    expect(status).toEqual(422);
    expect(data).toMatchObject({
      error: {
        message: expect.stringContaining("Invalid email"),
      },
    });
  });

  test("fails with missing partner email", async () => {
    const { data, status } = await http.post({
      path: "/tokens/embed/referrals",
      body: {
        partner: {
          name: generateRandomName(),
        },
      },
    });

    expect(status).toEqual(422);
    expect(data).toMatchObject({
      error: {
        message: expect.stringContaining("Required"),
      },
    });
  });
});
