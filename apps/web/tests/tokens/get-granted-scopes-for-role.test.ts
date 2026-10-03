import { OAUTH_SCOPES } from "@/lib/api/oauth/constants";
import {
  getDisplayedScopesForRole,
  getGrantedScopesForRole,
  getMissingScopesForRole,
} from "@/lib/api/tokens/scopes";
import { WorkspaceRole } from "@prisma/client";
import { describe, expect, test } from "vitest";

const ALL_OAUTH_SCOPES = [...OAUTH_SCOPES];

const OWNER_ONLY_OAUTH_SCOPES = ["domains.write", "webhooks.write"];

const READ_OAUTH_SCOPES = ALL_OAUTH_SCOPES.filter(
  (scope) => scope === "user.read" || scope.endsWith(".read"),
);

describe("getGrantedScopesForRole", () => {
  test("owner is granted every requested OAuth scope including user.read", () => {
    expect(
      getGrantedScopesForRole({
        scopes: ALL_OAUTH_SCOPES,
        role: "owner",
      }),
    ).toEqual(ALL_OAUTH_SCOPES);
  });

  test("member is granted write scopes except owner-only ones", () => {
    expect(
      getGrantedScopesForRole({
        scopes: ALL_OAUTH_SCOPES,
        role: "member",
      }),
    ).toEqual(
      ALL_OAUTH_SCOPES.filter(
        (scope) => !OWNER_ONLY_OAUTH_SCOPES.includes(scope),
      ),
    );
  });

  test.each(["viewer", "billing"] as const)(
    "%s is only granted read OAuth scopes and user.read",
    (role: WorkspaceRole) => {
      expect(
        getGrantedScopesForRole({
          scopes: ALL_OAUTH_SCOPES,
          role,
        }),
      ).toEqual(READ_OAUTH_SCOPES);
    },
  );

  test("always grants user.read even when other requested scopes are not allowed", () => {
    expect(
      getGrantedScopesForRole({
        scopes: ["user.read", "domains.write", "webhooks.write"],
        role: "viewer",
      }),
    ).toEqual(["user.read"]);
  });

  test("drops unknown scopes", () => {
    expect(
      getGrantedScopesForRole({
        scopes: ["links.read", "not.a.scope", "user.read"],
        role: "owner",
      }),
    ).toEqual(["links.read", "user.read"]);
  });

  test("preserves the order of requested scopes", () => {
    expect(
      getGrantedScopesForRole({
        scopes: ["user.read", "webhooks.write", "links.read"],
        role: "owner",
      }),
    ).toEqual(["user.read", "webhooks.write", "links.read"]);
  });

  test("returns an empty array when no requested scopes can be granted", () => {
    expect(
      getGrantedScopesForRole({
        scopes: ["domains.write", "webhooks.write"],
        role: "billing",
      }),
    ).toEqual([]);
  });

  test("member is granted domains.read and not domains.write when both are requested", () => {
    const scopes = ["domains.read", "domains.write"];

    expect(
      getGrantedScopesForRole({
        scopes,
        role: "member",
      }),
    ).toEqual(["domains.read"]);

    expect(
      getMissingScopesForRole({
        scopes,
        role: "member",
      }),
    ).toEqual(["domains.write"]);

    expect(
      getDisplayedScopesForRole({
        scopes,
        role: "member",
      }),
    ).toEqual([
      { scope: "domains.read", missing: false },
      { scope: "domains.write", missing: true },
    ]);
  });

  test("surfaces granted domains.read when domains.write is requested first", () => {
    const scopes = ["domains.write", "domains.read"];

    expect(
      getDisplayedScopesForRole({
        scopes,
        role: "member",
      }),
    ).toEqual([
      { scope: "domains.write", missing: true },
      { scope: "domains.read", missing: false },
    ]);
  });
});
