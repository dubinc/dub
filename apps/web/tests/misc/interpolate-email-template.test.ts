import { interpolateEmailTemplate } from "@/lib/api/campaigns/interpolate-email-template";
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

  it("HTML-escapes non-link variables to avoid injection", () => {
    expect(
      interpolateEmailTemplate({
        text: "Hi {{PartnerName}}",
        variables: { PartnerName: "<script>alert(1)</script>" },
      }),
    ).toBe("Hi &lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("replaces reward variables with their formatted values", () => {
    expect(
      interpolateEmailTemplate({
        text: "Commission: {{SaleReward}}",
        variables: { SaleReward: "30% per sale for 6 months" },
      }),
    ).toBe("Commission: 30% per sale for 6 months");
  });

  it("HTML-escapes reward variables to avoid injection", () => {
    expect(
      interpolateEmailTemplate({
        text: "Reward: {{SaleReward}}",
        variables: { SaleReward: "<b>30%</b>" },
      }),
    ).toBe("Reward: &lt;b&gt;30%&lt;/b&gt;");
  });

  it("uses fallback when a reward variable is missing", () => {
    expect(
      interpolateEmailTemplate({
        text: "Reward: {{SaleReward | N/A}}",
        variables: {},
      }),
    ).toBe("Reward: N/A");
  });
});
