import {
  getCommissionCreatedActivity,
  getCommissionSourceDisplay,
} from "@/lib/commissions/display-commission-source";
import { PROGRAM_IMPORT_SOURCES } from "@/lib/constants/program";
import { CommissionSource } from "@prisma/client";
import { describe, expect, test } from "vitest";

describe("getCommissionSourceDisplay", () => {
  test("returns null when the commission has no source", () => {
    expect(getCommissionSourceDisplay(null)).toBeNull();
    expect(getCommissionSourceDisplay(undefined)).toBeNull();
  });

  test.each([
    ["rewardful", "imported from Rewardful"],
    ["partnerstack", "imported from PartnerStack"],
    ["firstpromoter", "imported from FirstPromoter"],
    ["tolt", "imported from Tolt"],
    ["tapfiliate", "imported from Tapfiliate"],
    ["lemonsqueezy", "imported from Lemon Squeezy"],
    ["affiliatewp", "imported from AffiliateWP"],
  ] as const)("describes %s as %s", (source, phrase) => {
    expect(getCommissionSourceDisplay(source)?.phrase).toBe(phrase);
  });

  test.each([
    ["api", "tracked by API"],
    ["user", "created by user"],
    ["stripe", "tracked by Stripe"],
    ["shopify", "tracked by Shopify"],
    ["hubspot", "tracked by HubSpot"],
    ["appsflyer", "tracked by AppsFlyer"],
    ["singular", "tracked by Singular"],
  ] as const)("describes %s as %s", (source, phrase) => {
    expect(getCommissionSourceDisplay(source)?.phrase).toBe(phrase);
  });

  test("covers every commission source", () => {
    for (const source of Object.values(CommissionSource)) {
      const display = getCommissionSourceDisplay(source);

      expect(display?.phrase).toBeTruthy();
      expect(display?.image || source === "user").toBeTruthy();
    }
  });

  test("reuses import source artwork", () => {
    for (const source of Object.values(PROGRAM_IMPORT_SOURCES)) {
      expect(
        getCommissionSourceDisplay(source.id as CommissionSource)?.image,
      ).toBe(source.image);
    }
  });
});

describe("getCommissionCreatedActivity", () => {
  test("uses the source phrase and pending when later activity exists", () => {
    expect(
      getCommissionCreatedActivity({
        source: "stripe",
        status: "paid",
        hasActivityLogs: true,
      }),
    ).toEqual({
      lead: "Commission tracked by",
      status: "pending",
      showUser: false,
    });
  });

  test("keeps the imported status when there is no activity history", () => {
    expect(
      getCommissionCreatedActivity({
        source: "rewardful",
        status: "paid",
        hasActivityLogs: false,
      }),
    ).toEqual({
      lead: "Commission imported from",
      status: "paid",
      showUser: false,
    });
  });

  test("points a manual commission at the creating user", () => {
    expect(
      getCommissionCreatedActivity({
        source: "user",
        status: "pending",
        hasActivityLogs: false,
        hasUser: true,
      }),
    ).toEqual({
      lead: "Commission created by",
      status: "pending",
      showUser: true,
    });
  });

  test("falls back to the previous copy when source is missing", () => {
    expect(
      getCommissionCreatedActivity({
        source: null,
        status: "processed",
        hasActivityLogs: false,
      }),
    ).toEqual({
      lead: "Commission imported as",
      status: "processed",
      showUser: false,
    });

    expect(
      getCommissionCreatedActivity({
        source: null,
        status: "pending",
        hasActivityLogs: false,
      }),
    ).toEqual({
      lead: "Commission",
      status: "pending",
      showUser: false,
    });
  });
});
