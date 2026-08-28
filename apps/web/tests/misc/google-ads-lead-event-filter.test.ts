import { resolveGoogleAdsConversionMapping } from "@/lib/integrations/google-ads/utils";
import { describe, expect, it } from "vitest";

const signUpAction = "customers/1/conversionActions/signup";
const trialAction = "customers/1/conversionActions/trial";
const purchaseAction = "customers/1/conversionActions/purchase";

describe("resolveGoogleAdsConversionMapping", () => {
  it("returns null when no mappings are configured", () => {
    expect(
      resolveGoogleAdsConversionMapping({
        mappings: [],
        eventName: "Sign Up",
      }),
    ).toBeNull();
  });

  it("matches a catch-all mapping with empty event names", () => {
    expect(
      resolveGoogleAdsConversionMapping({
        mappings: [{ conversionAction: signUpAction, eventNames: [] }],
        eventName: "Sign Up",
      }),
    ).toEqual({ conversionAction: signUpAction, eventNames: [] });
  });

  it("matches a mapping by event name", () => {
    expect(
      resolveGoogleAdsConversionMapping({
        mappings: [
          { conversionAction: signUpAction, eventNames: ["Sign Up"] },
          { conversionAction: trialAction, eventNames: ["Started Trial"] },
        ],
        eventName: "Started Trial",
      }),
    ).toEqual({
      conversionAction: trialAction,
      eventNames: ["Started Trial"],
    });
  });

  it("prefers a specific event-name mapping over a catch-all", () => {
    expect(
      resolveGoogleAdsConversionMapping({
        mappings: [
          { conversionAction: purchaseAction, eventNames: [] },
          { conversionAction: signUpAction, eventNames: ["Sign Up"] },
        ],
        eventName: "Sign Up",
      }),
    ).toEqual({
      conversionAction: signUpAction,
      eventNames: ["Sign Up"],
    });
  });

  it("returns null when no mapping matches the event name", () => {
    expect(
      resolveGoogleAdsConversionMapping({
        mappings: [{ conversionAction: signUpAction, eventNames: ["Sign Up"] }],
        eventName: "Demo Booked",
      }),
    ).toBeNull();
  });

  it("skips unnamed events unless a catch-all mapping exists", () => {
    expect(
      resolveGoogleAdsConversionMapping({
        mappings: [{ conversionAction: signUpAction, eventNames: ["Sign Up"] }],
        eventName: undefined,
      }),
    ).toBeNull();

    expect(
      resolveGoogleAdsConversionMapping({
        mappings: [{ conversionAction: signUpAction, eventNames: [] }],
        eventName: undefined,
      }),
    ).toEqual({ conversionAction: signUpAction, eventNames: [] });
  });
});
