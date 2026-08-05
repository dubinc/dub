import {
  formatCampaignFromAddress,
  parseCampaignFromAddress,
  resolveCampaignFromAddress,
} from "@/lib/email/parse-campaign-from-address";
import {
  CAMPAIGN_FROM_FORMAT_ERROR,
  campaignFromSchema,
} from "@/lib/zod/schemas/campaigns";
import { describe, expect, it } from "vitest";

describe("parseCampaignFromAddress", () => {
  it.each([
    ["alice@mail.acme.com", null, "alice@mail.acme.com"],
    [
      "Alice from Acme <alice@mail.acme.com>",
      "Alice from Acme",
      "alice@mail.acme.com",
    ],
    [
      "  Bob from Acme <bob@mail.acme.com>  ",
      "Bob from Acme",
      "bob@mail.acme.com",
    ],
    ["Support <support@mail.acme.com>", "Support", "support@mail.acme.com"],
  ])("parses %s", (input, displayName, email) => {
    expect(parseCampaignFromAddress(input)).toEqual({ displayName, email });
  });

  it.each([
    ["", "empty"],
    ["Alice", "name only"],
    ["Alice from Acme <alice@mail.acme.com", "missing closing >"],
    ["<alice@mail.acme.com>", "empty display name"],
    ["Alice <>", "empty email"],
    ["Alice <not-an-email>", "invalid email in brackets"],
    ["Name <a@b.com> extra", "trailing junk"],
  ])("rejects invalid: %s — %s", (input) => {
    expect(parseCampaignFromAddress(input)).toBeNull();
  });
});

describe("formatCampaignFromAddress", () => {
  it("formats a named address and lowercases the email", () => {
    expect(
      formatCampaignFromAddress({
        displayName: "Alice from Acme",
        email: "Alice@Mail.Acme.com",
      }),
    ).toBe("Alice from Acme <alice@mail.acme.com>");
  });

  it("formats a bare email lowercased", () => {
    expect(
      formatCampaignFromAddress({
        displayName: null,
        email: "Alice@Mail.Acme.com",
      }),
    ).toBe("alice@mail.acme.com");
  });
});

describe("resolveCampaignFromAddress", () => {
  it("wraps bare emails with the program name", () => {
    expect(
      resolveCampaignFromAddress({
        from: "alice@mail.acme.com",
        programName: "Acme",
      }),
    ).toBe("Acme <alice@mail.acme.com>");
  });

  it("passes through named addresses without using the program name", () => {
    expect(
      resolveCampaignFromAddress({
        from: "Alice from Acme <alice@mail.acme.com>",
        programName: "Acme",
      }),
    ).toBe("Alice from Acme <alice@mail.acme.com>");
  });
});

describe("campaignFromSchema", () => {
  it("accepts a bare email and lowercases it", () => {
    expect(campaignFromSchema.parse("Alice@Mail.Acme.com")).toBe(
      "alice@mail.acme.com",
    );
  });

  it("accepts Name <email> and preserves display name casing", () => {
    expect(
      campaignFromSchema.parse("Alice from Acme <Alice@Mail.Acme.com>"),
    ).toBe("Alice from Acme <alice@mail.acme.com>");
  });

  it("rejects invalid formats", () => {
    const result = campaignFromSchema.safeParse("Alice");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(CAMPAIGN_FROM_FORMAT_ERROR);
    }
  });
});
