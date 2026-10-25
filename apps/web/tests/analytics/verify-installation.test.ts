import { analyzeDubAnalyticsScript } from "@/lib/analytics/verify-installation";
import { describe, expect, it } from "vitest";

const pageWithScript = (attrs: string) =>
  `<html><body><script src="https://www.dubcdn.com/analytics/script.js" ${attrs}></script></body></html>`;

describe("analyzeDubAnalyticsScript", () => {
  it("passes a basic Dub script", () => {
    expect(analyzeDubAnalyticsScript(pageWithScript("defer"))).toBe("ok");
  });
});
