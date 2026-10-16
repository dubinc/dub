import {
  getNormalizedEmail,
  normalizeEmail,
} from "@/lib/email/normalize-email";
import { describe, expect, it } from "vitest";

describe("normalizeEmail", () => {
  it.each([
    ["john.doe@gmail.com", "johndoe@gmail.com", "gmail dots"],
    ["j.o.h.n.d.o.e@gmail.com", "johndoe@gmail.com", "gmail dots everywhere"],
    ["john_doe@example.com", "johndoe@example.com", "underscore"],
    ["john-doe@example.com", "johndoe@example.com", "hyphen"],
    ["john.doe@example.com", "johndoe@example.com", "dots on any domain"],
    ["john+promo@gmail.com", "john@gmail.com", "plus tag"],
    ["j.o_h-n+promo.x@gmail.com", "john@gmail.com", "plus tag with separators"],
    ["johndoe@googlemail.com", "johndoe@gmail.com", "googlemail alias"],
    ["  John.Doe@Gmail.COM  ", "johndoe@gmail.com", "case and whitespace"],
    [
      "sub.domain@mail.example.co.uk",
      "subdomain@mail.example.co.uk",
      "keeps domain dots",
    ],
  ])("%s -> %s (%s)", (input, expected) => {
    expect(normalizeEmail(input)).toBe(expected);
  });

  it.each([
    ["not-an-email", "not-an-email", "no @"],
    ["a@b@c.com", "a@b@c.com", "multiple @"],
    ["...@gmail.com", "...@gmail.com", "local part empty after stripping"],
    ["+tag@gmail.com", "+tag@gmail.com", "local part empty after plus strip"],
  ])("returns trimmed lowercase input for %s (%s)", (input, expected) => {
    expect(normalizeEmail(input)).toBe(expected);
  });

  it.each([
    ["elliannjara.mi.ll.o6.18@gmail.com", "elliannjaram.i.llo6.18@gmail.com"],
    ["huychnuant.a.n.g.man.h@gmail.com", "huychnuant.a.n.gmanh@gmail.com"],
    ["m.a.n.s.u.r.k.u.t.a.n@gmail.com", "mansurkutan@gmail.com"],
  ])("treats %s and %s as the same address", (a, b) => {
    expect(normalizeEmail(a)).toBe(normalizeEmail(b));
  });

  it("keeps distinct addresses distinct", () => {
    expect(normalizeEmail("johndoe@gmail.com")).not.toBe(
      normalizeEmail("janedoe@gmail.com"),
    );
    expect(normalizeEmail("johndoe@gmail.com")).not.toBe(
      normalizeEmail("johndoe@yahoo.com"),
    );
  });
});

describe("getNormalizedEmail", () => {
  it("returns null for empty values", () => {
    expect(getNormalizedEmail(null)).toBeNull();
    expect(getNormalizedEmail(undefined)).toBeNull();
    expect(getNormalizedEmail("")).toBeNull();
  });

  it("normalizes non-empty values", () => {
    expect(getNormalizedEmail("John.Doe@gmail.com")).toBe("johndoe@gmail.com");
  });
});
