import { nanoid } from "@dub/utils";
import { Link } from "@prisma/client";
import { randomId } from "tests/utils/helpers";
import { afterAll, describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import {
  E2E_DISCOUNT,
  E2E_LEAD_REWARD,
  E2E_PARTNER,
  E2E_PARTNER_GROUP,
  E2E_PROGRAM,
  E2E_SALE_REWARD,
} from "../utils/resource";
import { partnerLink } from "./resource";

describe.sequential("PUT /partners/links/upsert", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  let createdLink: Link;

  afterAll(async () => {
    await h.deleteLink(createdLink.id);
  });

  const body = {
    partnerId: E2E_PARTNER.id,
    url: `${E2E_PARTNER_GROUP.url}/${nanoid()}`,
    leadRewardId: E2E_LEAD_REWARD.id,
    saleRewardId: E2E_SALE_REWARD.id,
    discountId: E2E_DISCOUNT.id,
  };

  test("New link", async () => {
    const { data, status } = await http.put<Link>({
      path: "/partners/links/upsert",
      body,
    });

    createdLink = data;

    expect(status).toEqual(200);
    expect(createdLink).toStrictEqual({
      ...partnerLink,
      url: body.url,
      leadReward: body.leadRewardId,
      saleReward: body.saleRewardId,
      discount: body.discountId,
    });
  });

  test("Existing link", async () => {
    const key = randomId();

    const { data: updatedLink, status } = await http.put<Link>({
      path: "/partners/links/upsert",
      body: {
        ...body,
        key,
      },
    });

    expect(status).toEqual(200);
    expect(updatedLink).toStrictEqual({
      ...createdLink,
      updatedAt: expect.any(String),
      key,
      shortLink: `https://${E2E_PROGRAM.domain}/${key}`,
      qrCode: `https://api.dub.co/qr?url=https://${E2E_PROGRAM.domain}/${key}?qr=1`,
    });
  });
});
