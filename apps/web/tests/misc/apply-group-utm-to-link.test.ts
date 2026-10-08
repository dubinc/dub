import { applyGroupUtmToLink } from "@/lib/api/utm/apply-group-utm-to-link";
import { ProcessedLinkProps } from "@/lib/types";
import { describe, expect, it } from "vitest";

const baseLink = {
  domain: "dub.sh",
  key: "abc1234",
  url: "https://example.com/path?foo=bar",
  projectId: "ws_test",
} as ProcessedLinkProps;

const template = {
  utm_source: "{{PARTNER_NAME}}",
  utm_medium: "affiliate",
  utm_campaign: "{{PARTNER_LINK_KEY}}",
  utm_term: null,
  utm_content: null,
  ref: "partner-{{PARTNER_LINK_KEY}}",
};

describe("applyGroupUtmToLink", () => {
  it("returns the link unchanged when there is no UTM template", () => {
    expect(
      applyGroupUtmToLink({
        link: baseLink,
        utmTemplate: null,
        partnerName: "John Doe",
      }),
    ).toBe(baseLink);

    expect(
      applyGroupUtmToLink({
        link: baseLink,
        utmTemplate: undefined,
        partnerName: "John Doe",
      }),
    ).toBe(baseLink);
  });

  it("resolves macros with the final processed link key (not partner name)", () => {
    const result = applyGroupUtmToLink({
      link: baseLink,
      utmTemplate: template,
      partnerName: "John Doe",
    });

    const parsed = new URL(result.url);
    expect(parsed.searchParams.get("utm_source")).toBe("John Doe");
    expect(parsed.searchParams.get("utm_medium")).toBe("affiliate");
    expect(parsed.searchParams.get("utm_campaign")).toBe("abc1234");
    expect(parsed.searchParams.get("ref")).toBe("partner-abc1234");
    expect(parsed.searchParams.get("foo")).toBe("bar");

    expect(result.utm_source).toBe("John Doe");
    expect(result.utm_medium).toBe("affiliate");
    expect(result.utm_campaign).toBe("abc1234");
    expect(result).not.toHaveProperty("ref");
  });

  it("uses link.key as partnerName fallback when partnerName is missing", () => {
    const result = applyGroupUtmToLink({
      link: baseLink,
      utmTemplate: template,
      partnerName: null,
    });

    expect(new URL(result.url).searchParams.get("utm_source")).toBe("abc1234");
  });

  it("overwrites unresolved macros already present on the destination URL", () => {
    const result = applyGroupUtmToLink({
      link: {
        ...baseLink,
        url: "https://example.com/?utm_source={{PARTNER_NAME}}&utm_campaign={{PARTNER_LINK_KEY}}&foo=1",
      },
      utmTemplate: template,
      partnerName: "John Doe",
    });

    const parsed = new URL(result.url);
    expect(parsed.searchParams.get("utm_source")).toBe("John Doe");
    expect(parsed.searchParams.get("utm_campaign")).toBe("abc1234");
    expect(parsed.searchParams.get("foo")).toBe("1");
    expect(parsed.searchParams.get("utm_source")).not.toContain("{{");
  });

  it("overwrites existing static UTM params on the destination URL", () => {
    const result = applyGroupUtmToLink({
      link: {
        ...baseLink,
        url: "https://example.com/?utm_source=old-source&utm_campaign=old-campaign",
      },
      utmTemplate: template,
      partnerName: "John Doe",
    });

    const parsed = new URL(result.url);
    expect(parsed.searchParams.get("utm_source")).toBe("John Doe");
    expect(parsed.searchParams.get("utm_campaign")).toBe("abc1234");
  });

  it("simulates create-without-key: random key must win over partner name for PARTNER_LINK_KEY", () => {
    // Mimics processLink assigning getRandomKey() after the request omitted key.
    const processedLink = {
      ...baseLink,
      key: "x7k9m2p",
      url: "https://example.com/",
    } as ProcessedLinkProps;

    const result = applyGroupUtmToLink({
      link: processedLink,
      utmTemplate: {
        ...template,
        utm_source: "{{PARTNER_LINK_KEY}}",
        utm_campaign: "{{PARTNER_NAME}}",
      },
      partnerName: "John Doe",
    });

    const parsed = new URL(result.url);
    expect(parsed.searchParams.get("utm_source")).toBe("x7k9m2p");
    expect(parsed.searchParams.get("utm_campaign")).toBe("John Doe");
    // Regression: old create paths fell back partnerLinkKey to partner name.
    expect(parsed.searchParams.get("utm_source")).not.toBe("John Doe");
  });
});
