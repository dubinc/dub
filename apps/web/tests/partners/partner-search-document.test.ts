import {
  PartnerSearchDocumentSource,
  serializePartnerSearchDocument,
} from "@/lib/api/partners/search";
import { describe, expect, it } from "vitest";

const source: PartnerSearchDocumentSource = {
  id: "pge_test",
  programId: "prog_test",
  partnerId: "pn_test",
  status: "approved",
  groupId: "grp_test",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  partner: {
    name: "Rafi Hasan",
    email: "partner@example.com",
    companyName: "Dub Partners",
    description: "Developer tools educator",
    country: "CA",
    updatedAt: new Date("2026-01-03T00:00:00.000Z"),
    platforms: [
      {
        type: "website",
        identifier: "https://rafi.dev",
        updatedAt: new Date("2026-01-04T00:00:00.000Z"),
      },
      {
        type: "twitter",
        identifier: "@rafi-on-x",
        updatedAt: new Date("2026-01-05T00:00:00.000Z"),
      },
    ],
  },
  links: [
    {
      domain: "dub.sh",
      key: "rafi",
      shortLink: "https://dub.sh/rafi",
      url: "https://example.com/referrals/rafi",
      updatedAt: new Date("2026-01-06T00:00:00.000Z"),
    },
    {
      domain: "dub.sh",
      key: "rafi-tools",
      shortLink: "https://dub.sh/rafi-tools",
      url: "https://rafi.dev/tools",
      updatedAt: new Date("2026-01-07T00:00:00.000Z"),
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
      linkDomains: ["dub.sh"],
      linkKeys: ["rafi", "rafi-tools"],
      shortLinks: ["https://dub.sh/rafi", "https://dub.sh/rafi-tools"],
      destinationUrls: [
        "https://example.com/referrals/rafi",
        "https://rafi.dev/tools",
      ],
      status: "approved",
      groupId: "grp_test",
      country: "CA",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-07T00:00:00.000Z",
    });
  });
});
