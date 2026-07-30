import { extractAndResolveUtmParams } from "@/lib/api/utm/extract-and-resolve-utm-params";
import {
  assertValidPartnerMacroValue,
  isValidPartnerMacroTemplate,
  resolvePartnerMacros,
} from "@/lib/partners/macros";
import { constructURLFromUTMParams } from "@dub/utils";
import { describe, expect, it } from "vitest";

const context = {
  partnerName: "John Doe",
  partnerLinkKey: "john-doe",
};

describe("resolvePartnerMacros", () => {
  it("resolves PARTNER_NAME and PARTNER_LINK_KEY", () => {
    expect(resolvePartnerMacros("{{PARTNER_NAME}}", context)).toBe("John Doe");
    expect(resolvePartnerMacros("{{PARTNER_LINK_KEY}}", context)).toBe(
      "john-doe",
    );
  });

  it("resolves macros embedded in a larger value", () => {
    expect(
      resolvePartnerMacros("partner-{{PARTNER_LINK_KEY}}-campaign", context),
    ).toBe("partner-john-doe-campaign");
  });

  it("leaves plain strings unchanged", () => {
    expect(resolvePartnerMacros("google", context)).toBe("google");
  });
});

describe("isValidPartnerMacroTemplate", () => {
  it("accepts known macros and plain text", () => {
    expect(isValidPartnerMacroTemplate("{{PARTNER_NAME}}")).toBe(true);
    expect(isValidPartnerMacroTemplate("prefix-{{PARTNER_LINK_KEY}}")).toBe(
      true,
    );
    expect(isValidPartnerMacroTemplate("google")).toBe(true);
  });

  it("rejects unknown macros", () => {
    expect(isValidPartnerMacroTemplate("{{UNKNOWN}}")).toBe(false);
    expect(isValidPartnerMacroTemplate("{{PARTNER_EMAIL}}")).toBe(false);
  });

  it("assertPartnerMacroValueParses throws for unknown macros", () => {
    expect(() => assertValidPartnerMacroValue("{{UNKNOWN}}")).toThrow(
      /Invalid macro/,
    );
  });
});

describe("extractAndResolveUtmParams", () => {
  it("resolves macros and leaves null fields as null", () => {
    const params = extractAndResolveUtmParams(
      {
        utm_source: "{{PARTNER_NAME}}",
        utm_medium: "affiliate",
        utm_campaign: "{{PARTNER_LINK_KEY}}",
        utm_term: null,
        utm_content: null,
        ref: null,
      },
      context,
    );

    expect(params).toEqual({
      utm_source: "John Doe",
      utm_medium: "affiliate",
      utm_campaign: "john-doe",
      utm_term: null,
      utm_content: null,
      ref: null,
    });
  });

  it("preserves non-UTM query params when applying resolved UTMs", () => {
    const url = constructURLFromUTMParams(
      "https://example.com/path?foo=bar&af_siteid=existing",
      extractAndResolveUtmParams(
        {
          utm_source: "{{PARTNER_NAME}}",
          utm_medium: null,
          utm_campaign: "{{PARTNER_LINK_KEY}}",
          utm_term: null,
          utm_content: null,
          ref: null,
        },
        context,
      ),
    );

    const parsed = new URL(url);
    expect(parsed.searchParams.get("foo")).toBe("bar");
    expect(parsed.searchParams.get("af_siteid")).toBe("existing");
    expect(parsed.searchParams.get("utm_source")).toBe("John Doe");
    expect(parsed.searchParams.get("utm_campaign")).toBe("john-doe");
  });

  it("deletes UTM params when template fields are null", () => {
    const url = constructURLFromUTMParams(
      "https://example.com/?utm_source=Old+Name&utm_campaign=old-key&foo=bar",
      extractAndResolveUtmParams(
        {
          utm_source: null,
          utm_medium: null,
          utm_campaign: null,
          utm_term: null,
          utm_content: null,
          ref: null,
        },
        context,
      ),
    );

    const parsed = new URL(url);
    expect(parsed.searchParams.has("utm_source")).toBe(false);
    expect(parsed.searchParams.has("utm_campaign")).toBe(false);
    expect(parsed.searchParams.get("foo")).toBe("bar");
  });

  it("replaces a macro with a static value", () => {
    const url = constructURLFromUTMParams(
      "https://example.com/?utm_source=John+Doe",
      extractAndResolveUtmParams(
        {
          utm_source: "static-source",
          utm_medium: null,
          utm_campaign: null,
          utm_term: null,
          utm_content: null,
          ref: null,
        },
        context,
      ),
    );

    expect(new URL(url).searchParams.get("utm_source")).toBe("static-source");
  });
});
