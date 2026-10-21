import {
  getOwnedAssetKey,
  mintAssetKey,
  resolveIncomingImage,
} from "@/lib/storage/asset-keys";
import { OG_AVATAR_URL, R2_URL } from "@dub/utils";
import { describe, expect, it } from "vitest";

const url = (key: string) => `${R2_URL}/${key}`;

describe("getOwnedAssetKey", () => {
  it.each([
    ["customerAvatar", "cus_1", "customers/cus_1/avatar_abc1234"],
    ["partnerImage", "pn_1", "partners/pn_1/image_abc1234"],
    ["userAvatar", "user_1", "avatars/user_1"],
    ["userAvatar", "user_1", "avatars/user_1_abc1234"],
    ["workspaceLogo", "ws_1", "workspaces/ws_1/logo_abc1234"],
    // Legacy ids are stored without the ws_ prefix
    [
      "workspaceLogo",
      "cl7pj5kq4006835rbjlt2ofka",
      "workspaces/ws_cl7pj5kq4006835rbjlt2ofka/logo_abc1234",
    ],
    ["domainLogo", "dom_1", "domains/dom_1/logo_abc1234"],
    ["programLogo", "prog_1", "programs/prog_1/logo_abc1234"],
    ["programWordmark", "prog_1", "programs/prog_1/wordmark_abc1234"],
    ["integrationLogo", "int_1", "integrations/int_1_abc1234"],
    ["integrationScreenshot", "ws_1", "integration-screenshots/ws_1/abc1234"],
    ["linkImage", "link_1", "images/link_1"],
    ["linkImage", "link_1", "images/link_1_abc1234"],
    ["programResource", "prog_1", "programs/prog_1/logos/brand-kit-ab12.png"],
    ["programResource", "prog_1", "programs/prog_1/files/guide-ab12"],
  ] as const)("returns the key for an owned %s", (kind, ownerId, key) => {
    expect(getOwnedAssetKey({ kind, ownerId, url: url(key) })).toBe(key);
  });

  it("ignores query strings, like the old link image check", () => {
    expect(
      getOwnedAssetKey({
        kind: "linkImage",
        ownerId: "link_1",
        url: `${url("images/link_1_abc1234")}?v=2`,
      }),
    ).toBe("images/link_1_abc1234");
  });

  // The exact cross-tenant chain from the report: another tenant's
  // well-formed key, planted in a column this caller owns.
  it("rejects another tenant's object", () => {
    const victimLogo = url("workspaces/ws_victim/logo_oOYy56p");

    expect(
      getOwnedAssetKey({
        kind: "customerAvatar",
        ownerId: "cus_attacker",
        url: victimLogo,
      }),
    ).toBeNull();
    expect(
      getOwnedAssetKey({
        kind: "workspaceLogo",
        ownerId: "ws_attacker",
        url: victimLogo,
      }),
    ).toBeNull();
  });

  it.each([
    // An id that is a prefix of another id
    ["userAvatar", "user_1", "avatars/user_12"],
    ["userAvatar", "user_1", "avatars/user_12_abc1234"],
    ["customerAvatar", "cus_1", "customers/cus_12/avatar_abc1234"],
    ["integrationLogo", "int_1", "integrations/int_12_abc1234"],
    ["linkImage", "link_1", "images/link_12"],
    // Wrong kind for the owner
    ["programLogo", "prog_1", "programs/prog_1/wordmark_abc1234"],
    ["programResource", "prog_1", "programs/prog_1/logo_abc1234"],
    ["programResource", "prog_1", "programs/prog_1/lander/image_abc1234"],
    // Bad nonces and extra path segments
    ["customerAvatar", "cus_1", "customers/cus_1/avatar_"],
    ["customerAvatar", "cus_1", "customers/cus_1/avatar_abc/extra"],
    ["customerAvatar", "cus_1", "customers/cus_1/avatar_abc.png"],
    ["linkImage", "link_1", "images/link_1/extra"],
    // Legacy screenshots have no owner, so they are never owned
    ["integrationScreenshot", "ws_1", "integration-screenshots/abc1234"],
    ["integrationScreenshot", "ws_1", "integration-screenshots/ws_2/abc1234"],
  ] as const)("rejects %s %s -> %s", (kind, ownerId, key) => {
    expect(getOwnedAssetKey({ kind, ownerId, url: url(key) })).toBeNull();
  });

  it.each([
    url("customers/cus_1/avatar_abc/../../workspaces/ws_victim/logo_x"),
    url("customers/cus_1/%2e%2e/%2e%2e/workspaces/ws_victim/logo_x"),
    url("customers/cus_1/avatar_abc%2F..%2F..%2Fsecret"),
    "https://example.com/customers/cus_1/avatar_abc1234",
    `https://user:pass@${new URL(R2_URL).host}/customers/cus_1/avatar_abc1234`,
    `${OG_AVATAR_URL}cus_1`,
    "customers/cus_1/avatar_abc1234",
    "not a url",
    "",
  ])("rejects malformed or off-host URL %s", (value) => {
    expect(
      getOwnedAssetKey({
        kind: "customerAvatar",
        ownerId: "cus_1",
        url: value,
      }),
    ).toBeNull();
  });

  it("rejects missing values and owners", () => {
    const key = url("customers/cus_1/avatar_abc1234");

    expect(
      getOwnedAssetKey({ kind: "customerAvatar", ownerId: "cus_1", url: null }),
    ).toBeNull();
    expect(
      getOwnedAssetKey({ kind: "customerAvatar", ownerId: "", url: key }),
    ).toBeNull();
  });
});

describe("mintAssetKey", () => {
  it("mints keys the same owner owns", () => {
    const { key, url: mintedUrl } = mintAssetKey("customerAvatar", "cus_1");

    expect(key).toMatch(/^customers\/cus_1\/avatar_[A-Za-z0-9]{7}$/);
    expect(mintedUrl).toBe(url(key));
    expect(
      getOwnedAssetKey({
        kind: "customerAvatar",
        ownerId: "cus_1",
        url: mintedUrl,
      }),
    ).toBe(key);
  });

  it("scopes new screenshots to the workspace", () => {
    expect(mintAssetKey("integrationScreenshot", "ws_1").key).toMatch(
      /^integration-screenshots\/ws_1\/[A-Za-z0-9]{7}$/,
    );
  });
});

describe("resolveIncomingImage", () => {
  const owned = url("customers/cus_1/avatar_abc1234");

  it("passes through undefined and null", () => {
    expect(
      resolveIncomingImage({
        kind: "customerAvatar",
        ownerId: "cus_1",
        value: undefined,
      }),
    ).toEqual({ url: undefined, uploadKey: null });
    expect(
      resolveIncomingImage({
        kind: "customerAvatar",
        ownerId: "cus_1",
        value: null,
      }),
    ).toEqual({ url: null, uploadKey: null });
  });

  it("keeps an unchanged value, an owned value, and OG avatars", () => {
    const external = "https://example.com/a.png";

    expect(
      resolveIncomingImage({
        kind: "customerAvatar",
        ownerId: "cus_1",
        value: external,
        current: external,
      }),
    ).toEqual({ url: external, uploadKey: null });
    expect(
      resolveIncomingImage({
        kind: "customerAvatar",
        ownerId: "cus_1",
        value: owned,
      }),
    ).toEqual({ url: owned, uploadKey: null });
    expect(
      resolveIncomingImage({
        kind: "customerAvatar",
        ownerId: "cus_1",
        value: `${OG_AVATAR_URL}cus_1`,
      }),
    ).toEqual({ url: `${OG_AVATAR_URL}cus_1`, uploadKey: null });
  });

  it.each([
    url("workspaces/ws_victim/logo_oOYy56p"),
    url("customers/cus_2/avatar_abc1234"),
    "https://example.com/a.png",
    "data:image/png;base64,iVBORw0KGgo=",
  ])("copies %s into storage the owner owns", (value) => {
    const { url: resolvedUrl, uploadKey } = resolveIncomingImage({
      kind: "customerAvatar",
      ownerId: "cus_1",
      value,
    });

    expect(uploadKey).toMatch(/^customers\/cus_1\/avatar_[A-Za-z0-9]{7}$/);
    expect(resolvedUrl).toBe(url(uploadKey!));
  });
});
