import {
  grantLegacyScopePermissions,
  hasLegacyScopeGrant,
  LEGACY_SCOPE_GRANTS,
  PARTNER_SCOPES_ENFORCED_AT,
} from "@/lib/api/tokens/scopes";
import { describe, expect, test } from "vitest";

const ENFORCED_AT = PARTNER_SCOPES_ENFORCED_AT;

const LEGACY_PERMISSIONS = [
  "partners.read",
  "partners.write",
  "program_applications.read",
  "program_applications.write",
  "customers.read",
  "customers.write",
  "discount_codes.read",
  "discount_codes.write",
  "commissions.read",
  "commissions.write",
  "bounties.read",
  "bounties.write",
  "payouts.read",
] as const;

describe("grantLegacyScopePermissions", () => {
  test("grants legacy permissions when createdAt is missing", () => {
    expect(
      grantLegacyScopePermissions({
        permissions: ["links.read"],
        createdAt: null,
      }),
    ).toEqual(["links.read", ...LEGACY_PERMISSIONS]);

    expect(
      grantLegacyScopePermissions({
        permissions: ["links.read"],
      }),
    ).toEqual(["links.read", ...LEGACY_PERMISSIONS]);
  });

  test("grants legacy permissions when created before the cutoff", () => {
    const createdAt = new Date(ENFORCED_AT.getTime() - 1);

    expect(
      grantLegacyScopePermissions({
        permissions: ["links.read"],
        createdAt,
      }),
    ).toEqual(["links.read", ...LEGACY_PERMISSIONS]);

    expect(
      grantLegacyScopePermissions({
        permissions: ["links.read"],
        createdAt: createdAt.toISOString(),
      }),
    ).toEqual(["links.read", ...LEGACY_PERMISSIONS]);
  });

  test("does not grant legacy permissions at or after the cutoff", () => {
    const permissions = ["links.read"] as const;

    expect(
      grantLegacyScopePermissions({
        permissions: [...permissions],
        createdAt: ENFORCED_AT,
      }),
    ).toEqual([...permissions]);

    expect(
      grantLegacyScopePermissions({
        permissions: [...permissions],
        createdAt: new Date(ENFORCED_AT.getTime() + 1),
      }),
    ).toEqual([...permissions]);

    expect(
      grantLegacyScopePermissions({
        permissions: [...permissions],
        createdAt: ENFORCED_AT.toISOString(),
      }),
    ).toEqual([...permissions]);
  });

  test("keeps existing permissions and drops duplicates", () => {
    expect(
      grantLegacyScopePermissions({
        permissions: ["partners.read", "links.write", "partners.read"],
        createdAt: null,
      }),
    ).toEqual([
      "partners.read",
      "links.write",
      "partners.write",
      "program_applications.read",
      "program_applications.write",
      "customers.read",
      "customers.write",
      "discount_codes.read",
      "discount_codes.write",
      "commissions.read",
      "commissions.write",
      "bounties.read",
      "bounties.write",
      "payouts.read",
    ]);
  });

  describe("route grants", () => {
    const grants = [
      ...LEGACY_SCOPE_GRANTS,
      { enforcedAt: ENFORCED_AT, permissions: ["links.write"] as const },
    ];

    test("grants route permissions when created before the cutoff", () => {
      expect(
        grantLegacyScopePermissions({
          permissions: [],
          createdAt: new Date(ENFORCED_AT.getTime() - 1),
          grants,
        }),
      ).toEqual([...LEGACY_PERMISSIONS, "links.write"]);
    });

    test("grants route permissions when createdAt is missing", () => {
      expect(
        grantLegacyScopePermissions({
          permissions: [],
          createdAt: null,
          grants,
        }),
      ).toEqual([...LEGACY_PERMISSIONS, "links.write"]);
    });

    test("does not grant route permissions at or after the cutoff", () => {
      expect(
        grantLegacyScopePermissions({
          permissions: ["links.read"],
          createdAt: ENFORCED_AT,
          grants,
        }),
      ).toEqual(["links.read"]);
    });

    test("route permissions do not leak into the default grants", () => {
      expect(
        grantLegacyScopePermissions({
          permissions: [],
          createdAt: null,
        }),
      ).not.toContain("links.write");
    });
  });
});

describe("hasLegacyScopeGrant", () => {
  const before = new Date(ENFORCED_AT.getTime() - 1);

  test("is true for restricted and read-only keys made before the cutoff", () => {
    expect(
      hasLegacyScopeGrant({ scopes: ["links.read"], createdAt: before }),
    ).toBe(true);

    expect(
      hasLegacyScopeGrant({ scopes: ["apis.read"], createdAt: before }),
    ).toBe(true);
  });

  test("is false for all access keys", () => {
    expect(
      hasLegacyScopeGrant({ scopes: ["apis.all"], createdAt: before }),
    ).toBe(false);
  });

  test("is false when the scopes already cover every legacy permission", () => {
    expect(
      hasLegacyScopeGrant({
        scopes: [
          "partners.write",
          "program_applications.write",
          "customers.write",
          "discount_codes.write",
          "commissions.write",
          "bounties.write",
          "payouts.read",
        ],
        createdAt: before,
      }),
    ).toBe(false);
  });

  test("is false for keys made at or after the cutoff", () => {
    expect(
      hasLegacyScopeGrant({ scopes: ["links.read"], createdAt: ENFORCED_AT }),
    ).toBe(false);

    expect(
      hasLegacyScopeGrant({
        scopes: ["apis.read"],
        createdAt: ENFORCED_AT.toISOString(),
      }),
    ).toBe(false);
  });
});
