import {
  PartnerSearchDocumentSource,
  serializePartnerSearchDocument,
} from "@/lib/api/partners/search";
import { describe, expect, it } from "vitest";

const source: PartnerSearchDocumentSource = {
  id: "pge_test",
  programId: "prog_test",
  partnerId: "pn_test",
  status: "approved" as const,
  groupId: "grp_test",
  program: {
    url: "https://www.example.com/landing",
  },
  partner: {
    name: "Rafi Hasan",
    email: "partner@example.com",
    companyName: "Dub Partners",
    description: "Developer tools educator",
    country: "US",
    programPartnerTags: [
      { programId: "prog_test", partnerTagId: "ptag_a" },
      // A tag from a different program must not leak into this document.
      { programId: "prog_other", partnerTagId: "ptag_other" },
    ],
    platforms: [
      {
        type: "website",
        identifier: "https://rafi.dev",
      },
      {
        type: "twitter",
        identifier: "@rafi-on-x",
      },
    ],
  },
  links: [
    {
      key: "rafi",
      url: "https://example.com/referrals/rafi?utm_source=partner&token=abc",
    },
    {
      key: "rafi-tools",
      url: "https://rafi.dev/tools#pricing",
    },
  ],
};

describe("serializePartnerSearchDocument", () => {
  it("serializes all partner search fields", () => {
    expect(serializePartnerSearchDocument(source)).toEqual({
      id: "pge_test",
      programId: "prog_test",
      partnerId: "pn_test",
      name: "Rafi Hasan",
      email: "partner@example.com",
      companyName: "Dub Partners",
      description: "Developer tools educator",
      platformTypes: ["website", "twitter"],
      platformIdentifiers: ["https://rafi.dev", "@rafi-on-x"],
      linkKeys: ["rafi", "rafi-tools"],
      destinationUrls: [
        // The program's own host is dropped, the query string with it. A
        // partner-specific host is kept: it identifies the partner.
        "/referrals/rafi",
        "rafi.dev/tools",
      ],
      status: "approved",
      groupId: "grp_test",
      country: "US",
      // The tag from prog_other is dropped: tags are per program.
      partnerTagIds: ["ptag_a"],
    });
  });

  it("drops a destination that is only the program's root", () => {
    const document = serializePartnerSearchDocument({
      ...source,
      links: [{ key: "root", url: "https://example.com/" }],
    });

    expect(document.destinationUrls).toEqual([]);
  });

  it("keeps the whole host when the program has no URL", () => {
    const document = serializePartnerSearchDocument({
      ...source,
      program: { url: null },
      links: [{ key: "rafi", url: "https://example.com/referrals/rafi" }],
    });

    expect(document.destinationUrls).toEqual(["example.com/referrals/rafi"]);
  });

  it("keeps an unparseable destination as is", () => {
    const document = serializePartnerSearchDocument({
      ...source,
      links: [{ key: "raw", url: "not a url" }],
    });

    expect(document.destinationUrls).toEqual(["not a url"]);
  });
});
