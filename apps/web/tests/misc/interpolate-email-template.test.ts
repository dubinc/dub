import { interpolateEmailTemplate } from "@/lib/api/workflows/interpolate-email-template";
import { describe, expect, it } from "vitest";

describe("interpolateEmailTemplate", () => {
  it("replaces a variable with its value", () => {
    expect(
      interpolateEmailTemplate({
        text: "Hello {{PartnerName}}!",
        variables: { PartnerName: "John" },
      }),
    ).toBe("Hello John!");
  });

  it("uses fallback when variable is null", () => {
    expect(
      interpolateEmailTemplate({
        text: "Hello {{PartnerName | Guest}}!",
        variables: { PartnerName: null },
      }),
    ).toBe("Hello Guest!");
  });

  it("uses value over fallback when value is present", () => {
    expect(
      interpolateEmailTemplate({
        text: "Hello {{PartnerName | Guest}}!",
        variables: { PartnerName: "John" },
      }),
    ).toBe("Hello John!");
  });

  it("falls back to empty string when variable is missing and no fallback set", () => {
    expect(
      interpolateEmailTemplate({
        text: "Hello {{PartnerName}}!",
        variables: {},
      }),
    ).toBe("Hello !");
  });

  it("renders PartnerLink as a clickable anchor for https URLs", () => {
    expect(
      interpolateEmailTemplate({
        text: "Your link: {{PartnerLink}}",
        variables: { PartnerLink: "https://example.com/foo" },
      }),
    ).toBe(
      'Your link: <a href="https://example.com/foo" target="_blank" rel="noopener noreferrer">https://example.com/foo</a>',
    );
  });

  it("renders PartnerLink fallback as plain text when variable is missing", () => {
    expect(
      interpolateEmailTemplate({
        text: "Link: {{PartnerLink | N/A}}",
        variables: {},
      }),
    ).toBe("Link: N/A");
  });
});
