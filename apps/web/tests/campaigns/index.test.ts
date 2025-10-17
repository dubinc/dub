import { Campaign, CampaignList } from "@/lib/types";
import { updateCampaignSchema } from "@/lib/zod/schemas/campaigns";
import { E2E_PARTNER_GROUP } from "tests/utils/resource";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { IntegrationHarness } from "../utils/integration";

const campaign: z.infer<typeof updateCampaignSchema> = {
  name: "Updated Test Campaign",
  subject: "Updated Test Subject",
  triggerCondition: {
    attribute: "totalConversions",
    operator: "gte",
    value: 50,
  },
  bodyJson: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Test campaign body",
          },
        ],
      },
    ],
  },
};

const expectedCampaign: Partial<Campaign> = {
  ...campaign,
  type: "transactional",
  groups: [{ id: E2E_PARTNER_GROUP.id }],
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
};

describe.sequential("/campaigns/**", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  let campaignId = "";

  test("POST /campaigns - create draft campaign", async () => {
    const { status, data } = await http.post<{ id: string }>({
      path: "/campaigns",
      body: {
        type: "transactional",
      },
    });

    expect(status).toEqual(200);
    expect(data).toMatchObject({
      id: expect.any(String),
    });

    campaignId = data.id;
  });

  test("PATCH /campaigns/[campaignId] - update campaign content", async () => {
    const { status, data: updatedCampaign } = await http.patch<Campaign>({
      path: `/campaigns/${campaignId}`,
      body: {
        ...campaign,
        groupIds: [E2E_PARTNER_GROUP.id],
      },
    });

    expect(status).toEqual(200);
    expect(updatedCampaign).toStrictEqual({
      ...expectedCampaign,
      id: campaignId,
      status: "draft",
    });
  });

  test("GET /campaigns/[campaignId] - make sure the draft campaign is created", async () => {
    const { status, data: fetchedCampaign } = await http.get<Campaign>({
      path: `/campaigns/${campaignId}`,
    });

    expect(status).toEqual(200);
    expect(fetchedCampaign).toStrictEqual({
      ...expectedCampaign,
      id: campaignId,
      status: "draft",
    });
  });

  test("PATCH /campaigns/[campaignId] - publish campaign", async () => {
    const { status, data: publishedCampaign } = await http.patch<Campaign>({
      path: `/campaigns/${campaignId}`,
      body: {
        status: "active",
      },
    });

    expect(status).toEqual(200);
    expect(publishedCampaign).toStrictEqual({
      ...expectedCampaign,
      id: campaignId,
      status: "active",
    });
  });

  test("PATCH /campaigns/[campaignId] - pause campaign", async () => {
    const { status, data: pausedCampaign } = await http.patch<Campaign>({
      path: `/campaigns/${campaignId}`,
      body: {
        status: "paused",
      },
    });

    expect(status).toEqual(200);
    expect(pausedCampaign).toStrictEqual({
      ...expectedCampaign,
      id: campaignId,
      status: "paused",
    });
  });

  test("PATCH /campaigns/[campaignId] - resume campaign", async () => {
    const { status, data: resumedCampaign } = await http.patch<Campaign>({
      path: `/campaigns/${campaignId}`,
      body: {
        status: "active",
      },
    });

    expect(status).toEqual(200);
    expect(resumedCampaign).toStrictEqual({
      ...expectedCampaign,
      id: campaignId,
      status: "active",
    });
  });

  test("GET /campaigns - list campaigns", async () => {
    const { status, data: campaigns } = await http.get<CampaignList[]>({
      path: "/campaigns",
    });

    expect(status).toEqual(200);
    expect(Array.isArray(campaigns)).toBe(true);
    expect(campaigns.length).toBeGreaterThan(0);

    const campaign = campaigns.find((c) => c.id === campaignId);

    expect(campaign).toStrictEqual({
      id: campaignId,
      name: expectedCampaign.name,
      type: expectedCampaign.type,
      status: "active",
      groups: [{ id: E2E_PARTNER_GROUP.id }],
      delivered: 0,
      sent: 0,
      bounced: 0,
      opened: 0,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  test("GET /campaigns/[campaignId] - get single campaign", async () => {
    const { status, data: fetchedCampaign } = await http.get<Campaign>({
      path: `/campaigns/${campaignId}`,
    });

    expect(status).toEqual(200);
    expect(fetchedCampaign).toStrictEqual({
      ...expectedCampaign,
      id: campaignId,
      status: "active",
    });
  });

  test("DELETE /campaigns/[campaignId] - delete campaign", async () => {
    const { status, data } = await http.delete<{ id: string }>({
      path: `/campaigns/${campaignId}`,
    });

    expect(status).toEqual(200);
    expect(data).toStrictEqual({
      id: campaignId,
    });
  });
});
