import {
  buildPartnerDefaultLinkKey,
  normalizePartnerLinkKeyPrefix,
} from "@/lib/api/partners/generate-partner-link";
import { describe, expect, test } from "vitest";

describe("normalizePartnerLinkKeyPrefix", () => {
  test("strips leading and trailing slashes", () => {
    expect(normalizePartnerLinkKeyPrefix("/c/")).toBe("c");
    expect(normalizePartnerLinkKeyPrefix("ref")).toBe("ref");
  });
});

describe("buildPartnerDefaultLinkKey", () => {
  const partnerBase = {
    name: undefined,
    username: undefined,
    tenantId: undefined,
  } as const;

  test("explicit link.key ignores prefix and multi-link mode", () => {
    expect(
      buildPartnerDefaultLinkKey({
        link: { key: "custom-slug", prefix: "/c/" },
        partner: { ...partnerBase, email: "someone@example.com" },
        hasMoreThanOneDefaultLink: true,
      }),
    ).toBe("custom-slug");
  });

  test("prefix wraps identity slug when one default link", () => {
    expect(
      buildPartnerDefaultLinkKey({
        link: { prefix: "/c/" },
        partner: { ...partnerBase, email: "foo@bar.com" },
        hasMoreThanOneDefaultLink: false,
      }),
    ).toBe("c/foo");
  });

  test("prefix without slashes", () => {
    expect(
      buildPartnerDefaultLinkKey({
        link: { prefix: "ref" },
        partner: { ...partnerBase, email: "x@y.com" },
        hasMoreThanOneDefaultLink: false,
      }),
    ).toBe("ref/x");
  });

  test("no prefix keeps flat slug", () => {
    expect(
      buildPartnerDefaultLinkKey({
        link: {},
        partner: { ...partnerBase, email: "foo@bar.com" },
        hasMoreThanOneDefaultLink: false,
      }),
    ).toBe("foo");
  });

  test("multiple default links: nanoid suffix then prefix", () => {
    const key = buildPartnerDefaultLinkKey({
      link: { prefix: "/p/" },
      partner: { ...partnerBase, email: "a@b.com" },
      hasMoreThanOneDefaultLink: true,
    });
    expect(key).toMatch(/^p\/a-[a-z0-9]{4}$/);
  });

  test("username wins for identity before prefix", () => {
    expect(
      buildPartnerDefaultLinkKey({
        link: { prefix: "/c/" },
        partner: {
          ...partnerBase,
          email: "ignored@example.com",
          username: "acme_partner",
        },
        hasMoreThanOneDefaultLink: false,
      }),
    ).toBe("c/acme_partner");
  });
});
