import { Link } from "@dub/prisma/client";
import { randomId } from "tests/utils/helpers";
import { afterAll, describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import { E2E_PARTNER, E2E_PROGRAM } from "../utils/resource";
import { partnerLink } from "./resource";

describe.sequential("PUT /partners/links/upsert", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  let createdLink: Link;

  afterAll(async () => {
    await h.deleteLink(createdLink.id);
  });

  test("New link", async () => {
    const { data, status } = await http.put<Link>({
      path: "/partners/links/upsert",
      body: {
        programId: E2E_PROGRAM.id,
        partnerId: E2E_PARTNER.id,
        url: E2E_PROGRAM.url,
      },
    });

    createdLink = data;

    expect(status).toEqual(200);
    expect(createdLink).toStrictEqual({
      ...partnerLink,
      url: E2E_PROGRAM.url,
    });
  });

  test("Existing link", async () => {
    const newKey = randomId();

    const { data: updatedLink, status } = await http.put<Link>({
      path: "/partners/links/upsert",
      body: {
        programId: E2E_PROGRAM.id,
        partnerId: E2E_PARTNER.id,
        key: newKey,
      },
    });

    expect(status).toEqual(200);
    expect(updatedLink).toStrictEqual({
      ...createdLink,
      updatedAt: expect.any(String),
      key: newKey,
      shortLink: `https://${E2E_PROGRAM.domain}/${newKey}`,
      qrCode: `https://api.dub.co/qr?url=https://${E2E_PROGRAM.domain}/${newKey}?qr=1`,
    });
  });
});
