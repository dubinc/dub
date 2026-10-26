import {
  CUSTOMER_SCOPES_ENFORCED_AT,
  grantLegacyScopePermissions,
  LEGACY_SCOPE_GRANTS,
} from "@/lib/api/tokens/scopes";
import { describe, expect, test } from "vitest";

const ENFORCED_AT = CUSTOMER_SCOPES_ENFORCED_AT;

const LEGACY_PERMISSIONS = ["customers.read", "customers.write"] as const;

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
        permissions: ["customers.read", "links.write", "customers.read"],
        createdAt: null,
      }),
    ).toEqual(["customers.read", "links.write", "customers.write"]);
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
