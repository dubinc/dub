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
  tenantId: null,
  groupId: "grp_test",
  partner: {
    name: "Rafi Hasan",
    email: "partner@example.com",
    companyName: "Dub Partners",
    description: "Developer tools educator",
    country: "US",
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
  links: [{ key: "rafi" }, { key: "rafi-tools" }],
  programPartnerTags: [{ partnerTagId: "ptag_a" }, { partnerTagId: "ptag_a" }],
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
      status: "approved",
      tenantId: null,
      groupId: "grp_test",
      country: "US",
      partnerTagIds: ["ptag_a"],
    });
  });
});
