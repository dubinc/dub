import {
  PartnerSearchDocumentSource,
  serializePartnerSearchDocument,
} from "@/lib/api/partners/search";
import { describe, expect, it } from "vitest";

const source: PartnerSearchDocumentSource = {
  id: "pge_test",
  programId: "prog_test",
  partnerId: "pn_test",
  partner: {
    name: "Rafi Hasan",
    email: "partner@example.com",
    companyName: "Dub Partners",
    description: "Developer tools educator",
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
      domain: "dub.sh",
      key: "rafi",
      shortLink: "https://dub.sh/rafi",
      url: "https://example.com/referrals/rafi",
    },
    {
      domain: "dub.sh",
      key: "rafi-tools",
      shortLink: "https://dub.sh/rafi-tools",
      url: "https://rafi.dev/tools",
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
    });
  });
});
