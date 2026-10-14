import { analyzeDubAnalyticsScript } from "@/lib/analytics/verify-installation";
import { describe, expect, it } from "vitest";

const pageWithScript = (attrs: string) =>
  `<html><body><script src="https://www.dubcdn.com/analytics/script.js" ${attrs}></script></body></html>`;

describe("analyzeDubAnalyticsScript", () => {
  it("passes a basic Dub script without a required refer domain", () => {
    expect(analyzeDubAnalyticsScript(pageWithScript("defer"))).toBe("ok");
  });

  it("requires data-domains.refer when a program domain is provided", () => {
    expect(
      analyzeDubAnalyticsScript(pageWithScript("defer"), {
        referDomain: "refer.acme.com",
      }),
    ).toBe("missing_refer_domain");
  });

  it("accepts a matching data-domains refer value", () => {
    expect(
      analyzeDubAnalyticsScript(
        pageWithScript(`defer data-domains='{"refer":"refer.acme.com"}'`),
        { referDomain: "refer.acme.com" },
      ),
    ).toBe("ok");
  });

  it("accepts HTML-encoded data-domains JSON", () => {
    expect(
      analyzeDubAnalyticsScript(
        pageWithScript(
          `defer data-domains="{&quot;refer&quot;:&quot;refer.acme.com&quot;}"`,
        ),
        { referDomain: "refer.acme.com" },
      ),
    ).toBe("ok");
  });

  it("accepts data-domains with additional keys", () => {
    expect(
      analyzeDubAnalyticsScript(
        pageWithScript(
          `defer data-domains='{"refer":"refer.acme.com","site":"site.acme.com"}'`,
        ),
        { referDomain: "refer.acme.com" },
      ),
    ).toBe("ok");
  });

  it("rejects a data-domains refer value that does not match the program domain", () => {
    expect(
      analyzeDubAnalyticsScript(
        pageWithScript(`defer data-domains='{"refer":"other.link"}'`),
        { referDomain: "refer.acme.com" },
      ),
    ).toBe("missing_refer_domain");
  });

  it("normalizes protocol and casing when comparing refer domains", () => {
    expect(
      analyzeDubAnalyticsScript(
        pageWithScript(
          `defer data-domains='{"refer":"https://Refer.Acme.com/"}'`,
        ),
        { referDomain: "refer.acme.com" },
      ),
    ).toBe("ok");
  });

  it("accepts the legacy data-short-domain attribute", () => {
    expect(
      analyzeDubAnalyticsScript(
        pageWithScript(`defer data-short-domain="refer.acme.com"`),
        { referDomain: "refer.acme.com" },
      ),
    ).toBe("ok");
  });
});
