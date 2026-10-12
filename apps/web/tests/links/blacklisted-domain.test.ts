import {
  getBlacklistedDomainStatus,
  matchesBlacklistedTerm,
} from "@/lib/edge-config/is-blacklisted-domain";
import { describe, expect, it } from "vitest";

describe("matchesBlacklistedTerm", () => {
  it("blocks an apex hostname and its subdomains for a leading-dot term", () => {
    const term = ".evil.com";

    expect(matchesBlacklistedTerm(term, "evil.com")).toBe(true);
    expect(matchesBlacklistedTerm(term, "login.evil.com")).toBe(true);
    expect(matchesBlacklistedTerm(term, "a.b.evil.com")).toBe(true);
  });

  it("does not block lookalike or unrelated hosts", () => {
    const term = ".evil.com";

    expect(matchesBlacklistedTerm(term, "notevil.com")).toBe(false);
    expect(matchesBlacklistedTerm(term, "evil.com.attacker.net")).toBe(false);
    expect(matchesBlacklistedTerm(term, "example.com")).toBe(false);
  });

  it("keeps substring matching for terms without a leading dot", () => {
    expect(matchesBlacklistedTerm("bit.ly", "bit.ly")).toBe(true);
    expect(matchesBlacklistedTerm("bit.ly", "sub.bit.ly")).toBe(true);
    expect(matchesBlacklistedTerm("bit.ly", "example.com")).toBe(false);
  });
});

describe("getBlacklistedDomainStatus", () => {
  const terms = [".evil.com"];

  it("blacklists the apex the ban term was generated from", () => {
    expect(
      getBlacklistedDomainStatus({
        domain: "evil.com",
        blacklistedDomains: [],
        blacklistedTerms: terms,
        whitelistedDomains: [],
      }),
    ).toBe("blacklisted");
  });

  it("lets an exact whitelist win over a term", () => {
    expect(
      getBlacklistedDomainStatus({
        domain: "evil.com",
        blacklistedDomains: ["evil.com"],
        blacklistedTerms: terms,
        whitelistedDomains: ["evil.com"],
      }),
    ).toBe("whitelisted");
  });

  it("still matches an exact domains-list entry", () => {
    expect(
      getBlacklistedDomainStatus({
        domain: "phish.test",
        blacklistedDomains: ["phish.test"],
        blacklistedTerms: [],
        whitelistedDomains: [],
      }),
    ).toBe("blacklisted");
  });

  it("does not treat an empty terms list as a match-all", () => {
    expect(
      getBlacklistedDomainStatus({
        domain: "example.com",
        blacklistedDomains: [],
        blacklistedTerms: [],
        whitelistedDomains: [],
      }),
    ).toBe(null);
  });
});
