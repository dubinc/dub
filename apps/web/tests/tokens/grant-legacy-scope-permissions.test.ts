import {
  grantLegacyScopePermissions,
  LEGACY_SCOPE_GRANTS,
} from "@/lib/api/tokens/scopes";
import { describe, expect, test } from "vitest";

const ENFORCED_AT = LEGACY_SCOPE_GRANTS[0].enforcedAt;

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
});
