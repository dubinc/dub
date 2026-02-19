import {
  buildUpgradeUrl,
  parseUpgradeIntent,
  parseUpgradePlan,
} from "@/lib/billing/upgrade-intent";
import { describe, expect, it } from "vitest";

describe("upgrade-intent helpers", () => {
  it("parses valid upgrade plans", () => {
    expect(parseUpgradePlan("pro")).toBe("pro");
    expect(parseUpgradePlan("business")).toBe("business");
    expect(parseUpgradePlan("advanced")).toBe("advanced");
    expect(parseUpgradePlan("enterprise")).toBe("enterprise");
  });

  it("rejects invalid upgrade plans", () => {
    expect(parseUpgradePlan("free")).toBeUndefined();
    expect(parseUpgradePlan("")).toBeUndefined();
    expect(parseUpgradePlan(null)).toBeUndefined();
  });

  it("builds upgrade URLs with all intent params", () => {
    expect(
      buildUpgradeUrl({
        slug: "acme",
        upgradePlan: "advanced",
        upgradeSource: "partners_overview",
        showPartnersUpgradeModal: true,
      }),
    ).toBe(
      "/acme/upgrade?upgrade_plan=advanced&upgrade_source=partners_overview&showPartnersUpgradeModal=true",
    );
  });

  it("returns pricing URL when slug is missing", () => {
    expect(
      buildUpgradeUrl({
        slug: undefined,
        upgradePlan: "business",
      }),
    ).toBe("https://dub.co/pricing");
  });

  it("parses upgrade intent from search params", () => {
    const searchParams = new URLSearchParams({
      upgrade_plan: "advanced",
      upgrade_source: "partners_overview",
      showPartnersUpgradeModal: "true",
    });

    expect(parseUpgradeIntent(searchParams)).toEqual({
      upgradePlan: "advanced",
      upgradeSource: "partners_overview",
      showPartnersUpgradeModal: true,
    });
  });
});
