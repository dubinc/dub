import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import { ProgramPartnerLinkSchema } from "@/lib/zod/schemas/programs";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { DiscountProvider, EventType, RewardStructure } from "@prisma/client";
import * as z from "zod/v4";
import { apiError } from "../../utils";
import { test, type ApiClient } from "../fixtures";
import {
  createGroupWithAdditionalLinks,
  createPartner,
  deletePartner,
} from "../partners/helpers";
import { createReward, deleteReward } from "../rewards/helpers";
import { TEST_COMMISSION_REWARDS } from "../setup-test-workspace";

type PartnerLinkResponse = z.infer<typeof ProgramPartnerLinkSchema>;

function upsertPartnerLink(api: ApiClient, body: Record<string, unknown>) {
  return api.put<PartnerLinkResponse>("/api/partners/links/upsert", body);
}

test.describe("PUT /partners/links/upsert", () => {
  test.describe.configure({ mode: "serial" });

  let partnerId: string | undefined;
  let groupId: string | undefined;
  let discountId: string | undefined;
  let clickRewardId: string | undefined;
  let leadRewardId: string | undefined;
  let saleRewardId: string | undefined;
  let saleRewardId2: string | undefined;
  let url: string;
  let createdLinkId: string | undefined;

  test.beforeAll(async ({ api, program }) => {
    const group = await createGroupWithAdditionalLinks(program.id);
    groupId = group.id;

    const groupReward = {
      programId: program.id,
      groupId: group.id,
      type: RewardStructure.flat,
    };

    const [clickReward, leadReward, saleReward, saleReward2, discount] =
      await Promise.all([
        createReward({
          ...groupReward,
          event: EventType.click,
          amountInCents: 25,
        }),
        createReward({
          ...groupReward,
          event: EventType.lead,
          amountInCents: 150,
        }),
        createReward({
          ...groupReward,
          event: EventType.sale,
          amountInCents: 500,
        }),
        createReward({
          ...groupReward,
          event: EventType.sale,
          amountInCents: 900,
        }),
        prisma.discount.create({
          data: {
            id: createId({ prefix: "disc_" }),
            programId: program.id,
            groupId: group.id,
            amount: 15,
            type: RewardStructure.percentage,
            maxDuration: 3,
            provider: DiscountProvider.custom,
          },
        }),
      ]);

    clickRewardId = clickReward.id;
    leadRewardId = leadReward.id;
    saleRewardId = saleReward.id;
    saleRewardId2 = saleReward2.id;
    discountId = discount.id;

    const { data: partner } = await createPartner(api, { groupId: group.id });
    partnerId = partner.id;
    url = `https://example.com/${nanoid()}`;
  });

  test.afterAll(async () => {
    await deletePartner(partnerId);
    await Promise.all(
      [clickRewardId, leadRewardId, saleRewardId, saleRewardId2].map(
        deleteReward,
      ),
    );
    if (discountId) {
      await prisma.discount.delete({ where: { id: discountId } });
    }
    if (groupId) {
      await prisma.partnerGroup.delete({ where: { id: groupId } });
    }
  });

  test("creates a partner link with reward and discount overrides", async ({
    api,
  }) => {
    const { status, data } = await upsertPartnerLink(api, {
      partnerId,
      url,
      clickRewardId,
      leadRewardId,
      saleRewardId,
      discountId,
    });

    createdLinkId = data.id;

    expect(status).toEqual(200);
    expect(data).toMatchObject({
      id: expect.any(String),
      url,
      clickReward: clickRewardId,
      leadReward: leadRewardId,
      saleReward: saleRewardId,
      discount: discountId,
    });
  });

  test("updates an existing partner link key and reward overrides", async ({
    api,
  }) => {
    const key = nanoid(8);

    const { status, data } = await upsertPartnerLink(api, {
      partnerId,
      url,
      key,
      clickRewardId,
      leadRewardId,
      saleRewardId: saleRewardId2,
      discountId,
    });

    expect(status).toEqual(200);
    expect(data).toMatchObject({
      id: createdLinkId,
      key,
      url,
      clickReward: clickRewardId,
      leadReward: leadRewardId,
      saleReward: saleRewardId2,
      discount: discountId,
    });
  });

  test("rejects a reward that does not belong to the partner group", async ({
    api,
  }) => {
    expect(
      await upsertPartnerLink(api, {
        partnerId,
        url: `https://example.com/${nanoid()}`,
        saleRewardId: TEST_COMMISSION_REWARDS.sale.id,
      }),
    ).toEqual(
      apiError({
        code: "unprocessable_entity",
        message: `Reward ${TEST_COMMISSION_REWARDS.sale.id} does not belong to this partner's group.`,
      }),
    );
  });
});

test("PUT /partners/links/upsert – missing partnerId and tenantId", async ({
  api,
}) => {
  expect(
    await upsertPartnerLink(api, {
      url: `https://example.com/${nanoid()}`,
    }),
  ).toEqual(
    apiError({
      code: "bad_request",
      message: "Either `partnerId` or `tenantId` must be provided.",
    }),
  );
});
