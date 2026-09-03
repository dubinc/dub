import { prisma } from "@/lib/prisma";
import { expect } from "@playwright/test";
import { trackClick, trackLead } from "../conversions/helpers";
import { createCampaign } from "./helpers";
import { test } from "./send-campaign-workflow-fixtures";
import {
  campaignEmails,
  createTestCommission,
  enrolledDaysCondition,
  getCampaignWorkflow,
  insertCampaignEmail,
  runScheduledCampaignWorkflow,
  setEnrollmentStatus,
  setLinkStats,
  tagPartner,
} from "./send-campaign-workflow-helpers";

test.describe("Lifecycle", () => {
  test("transactional draft workflow is disabled", async ({
    api,
    campaign,
  }) => {
    const { status, data } = await createCampaign(api);
    expect(status).toEqual(201);
    campaign.trackCampaign(data.id);

    const workflow = await getCampaignWorkflow(data.id);
    expect(workflow.disabledAt).not.toBeNull();
    expect(workflow.actions).toEqual([
      {
        type: "sendCampaign",
        data: { campaignId: data.id },
      },
    ]);
  });

  test("publishing a transactional campaign enables the workflow", async ({
    campaign,
  }) => {
    const ctx = await campaign.setup();

    expect(ctx.workflow.disabledAt).toBeNull();
    expect(ctx.workflow.triggerConditions).toEqual([enrolledDaysCondition]);
    expect(ctx.workflow.actions).toEqual([
      {
        type: "sendCampaign",
        data: { campaignId: ctx.id },
      },
    ]);
  });

  test("pausing a campaign disables the workflow", async ({
    api,
    campaign,
  }) => {
    const ctx = await campaign.setup();

    const paused = await api.patch(`/api/campaigns/${ctx.id}`, {
      status: "paused",
    });
    expect(paused.status).toEqual(200);

    const workflow = await getCampaignWorkflow(ctx.id);
    expect(workflow.disabledAt).not.toBeNull();
  });

  test("draft and paused campaigns do not send", async ({ api, campaign }) => {
    const { data: draft } = await createCampaign(api);
    campaign.trackCampaign(draft.id);
    await api.patch(`/api/campaigns/${draft.id}`, {
      triggerConditions: [enrolledDaysCondition],
    });

    const paused = await campaign.setup();
    await api.patch(`/api/campaigns/${paused.id}`, { status: "paused" });

    const partner = await paused.createPartner();
    const draftWorkflow = await getCampaignWorkflow(draft.id);

    expect(await runScheduledCampaignWorkflow(draftWorkflow.id)).toEqual(
      "disabled",
    );
    expect(await paused.run()).toEqual("disabled");
    await paused.expectNotSentTo(partner);
    expect(await campaignEmails(draft.id, partner.id)).toHaveLength(0);
  });
});

test.describe("Scheduled window and recipients", () => {
  test("scheduled run skips a disabled workflow", async ({ campaign }) => {
    const ctx = await campaign.setup();
    const partner = await ctx.createPartner();
    await ctx.disableWorkflow();

    expect(await ctx.run()).toEqual("disabled");
    await ctx.expectNotSentTo(partner);
  });

  test("scheduled window only includes enrollments from 12–24h ago", async ({
    campaign,
  }) => {
    const ctx = await campaign.setup();
    const tooRecent = await ctx.createPartner({ hoursAgo: 6 });
    const inWindow = await ctx.createPartner({ hoursAgo: 18 });
    const tooOld = await ctx.createPartner({ hoursAgo: 30 });

    expect(await ctx.run()).toEqual("finished");
    await ctx.expectNotSentTo(tooRecent);
    await ctx.expectSentTo(inWindow);
    await ctx.expectNotSentTo(tooOld);
  });

  test("scheduled run skips eligible partners without a partner user", async ({
    campaign,
  }) => {
    const ctx = await campaign.setup();
    const partner = await ctx.createPartner({ mailbox: false });

    expect(await ctx.run()).toEqual("finished");
    await ctx.expectNotSentTo(partner);
  });

  test("scheduled run does not send duplicate campaign emails", async ({
    campaign,
  }) => {
    const ctx = await campaign.setup();
    const partner = await ctx.createPartner();

    expect(await ctx.run()).toEqual("finished");
    expect(await ctx.run()).toEqual("finished");

    const emails = await campaignEmails(ctx.id, partner.id);
    expect(emails).toHaveLength(1);
    expect(emails[0].type).toEqual("Campaign");
  });

  test("scheduled run skips partners who already received the campaign", async ({
    campaign,
  }) => {
    const ctx = await campaign.setup();
    const partner = await ctx.createPartner();
    const mailbox = await prisma.partnerUser.findFirstOrThrow({
      where: { partnerId: partner.id },
      select: { userId: true },
    });

    const existing = await insertCampaignEmail({
      campaignId: ctx.id,
      programId: campaign.programId,
      partnerId: partner.id,
      recipientUserId: mailbox.userId,
    });

    expect(await ctx.run()).toEqual("finished");

    const emails = await campaignEmails(ctx.id, partner.id);
    expect(emails).toHaveLength(1);
    expect(emails[0].id).toEqual(existing.id);
  });
});

test.describe("Scheduled AND conditions", () => {
  const scheduledAndCases = [
    {
      title: "sends when enrollment window and leads match",
      condition: { attribute: "totalLeads", operator: "gte", value: 1 },
      sent: true,
      seed: (partner, programId) =>
        setLinkStats({
          partnerId: partner.id,
          programId,
          leads: 1,
        }),
    },
    {
      title: "does not send when the metric condition fails",
      condition: { attribute: "totalLeads", operator: "gte", value: 1 },
      sent: false,
    },
    {
      title: "sends when totalLeads lte 0",
      condition: { attribute: "totalLeads", operator: "lte", value: 0 },
      sent: true,
    },
    {
      title: "sends when totalConversions matches",
      condition: {
        attribute: "totalConversions",
        operator: "gte",
        value: 1,
      },
      sent: true,
      seed: (partner, programId) =>
        setLinkStats({
          partnerId: partner.id,
          programId,
          conversions: 1,
        }),
    },
    {
      title: "sends when totalSaleAmount matches",
      condition: {
        attribute: "totalSaleAmount",
        operator: "gte",
        value: 100,
      },
      sent: true,
      seed: (partner, programId) =>
        setLinkStats({
          partnerId: partner.id,
          programId,
          saleAmount: 100,
        }),
    },
    {
      title: "sends when totalCommissions matches",
      condition: {
        attribute: "totalCommissions",
        operator: "gte",
        value: 1,
      },
      sent: true,
      seed: async (partner, programId) => {
        await createTestCommission({
          programId,
          partnerId: partner.id,
          earnings: 500,
        });
      },
    },
  ];

  for (const { title, condition, sent, seed } of scheduledAndCases) {
    test(`scheduled AND ${title}`, async ({ campaign }) => {
      const ctx = await campaign.setup({
        triggerConditions: [enrolledDaysCondition, condition],
      });
      const partner = await ctx.createPartner();
      await seed?.(partner, campaign.programId);

      expect(await ctx.run()).toEqual("finished");
      if (sent) {
        await ctx.expectSentTo(partner);
      } else {
        await ctx.expectNotSentTo(partner);
      }
    });
  }
});

test.describe("Audience", () => {
  test("group filter only sends to partners in selected groups", async ({
    campaign,
  }) => {
    const groupId = await campaign.createGroup();
    const ctx = await campaign.setup({ groupIds: [groupId] });
    const inGroup = await ctx.createPartner({ groupId });
    const outGroup = await ctx.createPartner({
      groupId: campaign.defaultGroupId,
    });

    expect(await ctx.run()).toEqual("finished");
    await ctx.expectSentTo(inGroup);
    await ctx.expectNotSentTo(outGroup);
  });

  test("partner tag filter only sends to tagged partners", async ({
    campaign,
  }) => {
    const tag = await campaign.createTag();
    const ctx = await campaign.setup({ partnerTagIds: [tag.id] });
    const tagged = await ctx.createPartner();
    await tagPartner({
      programId: campaign.programId,
      partnerId: tagged.id,
      partnerTagId: tag.id,
    });
    const untagged = await ctx.createPartner();

    expect(await ctx.run()).toEqual("finished");
    await ctx.expectSentTo(tagged);
    await ctx.expectNotSentTo(untagged);
  });

  test("group and tag filters both have to match", async ({ campaign }) => {
    const groupId = await campaign.createGroup();
    const tag = await campaign.createTag();
    const ctx = await campaign.setup({
      groupIds: [groupId],
      partnerTagIds: [tag.id],
    });
    const partner = await ctx.createPartner({ groupId });

    expect(await ctx.run()).toEqual("finished");
    await ctx.expectNotSentTo(partner);

    await tagPartner({
      programId: campaign.programId,
      partnerId: partner.id,
      partnerTagId: tag.id,
    });
    expect(await ctx.run()).toEqual("finished");
    await ctx.expectSentTo(partner);
  });

  test("non-approved enrollments are not sent", async ({ campaign }) => {
    const ctx = await campaign.setup();
    const partner = await ctx.createPartner();
    await setEnrollmentStatus({
      partnerId: partner.id,
      programId: campaign.programId,
      status: "pending",
    });

    expect(await ctx.run()).toEqual("finished");
    await ctx.expectNotSentTo(partner);
  });
});

test.describe("Event path", () => {
  test("partnerJoined does not send on the scheduled runner", async ({
    campaign,
  }) => {
    const ctx = await campaign.setup({
      triggerConditions: [
        { attribute: "partnerJoined", operator: "gte", value: 0 },
      ],
    });
    const partner = await ctx.createPartner({ hoursAgo: null });

    expect(await ctx.run()).toEqual("finished");
    await ctx.expectNotSentTo(partner);
  });

  test("leadRecorded sends when totalLeads matches and skips when it does not", async ({
    campaign,
  }) => {
    const ctx = await campaign.setup({
      triggerConditions: [
        { attribute: "totalLeads", operator: "gte", value: 2 },
      ],
    });

    const match = await ctx.createPartner({ hoursAgo: null });
    await setLinkStats({
      partnerId: match.id,
      programId: campaign.programId,
      leads: 1,
    });
    const matchClick = await trackClick({
      domain: match.links![0].domain,
      key: match.links![0].key,
    });
    await trackLead({ clickId: matchClick.clickId });

    const miss = await ctx.createPartner({ hoursAgo: null });
    const missClick = await trackClick({
      domain: miss.links![0].domain,
      key: miss.links![0].key,
    });
    await trackLead({ clickId: missClick.clickId });

    await ctx.expectSentTo(match);
    await ctx.expectNotSentTo(miss);
  });

  test("event runner skips disabled workflows", async ({ campaign }) => {
    const ctx = await campaign.setup({
      triggerConditions: [
        { attribute: "totalLeads", operator: "gte", value: 1 },
      ],
    });
    const partner = await ctx.createPartner({ hoursAgo: null });
    await ctx.disableWorkflow();

    const { clickId } = await trackClick({
      domain: partner.links![0].domain,
      key: partner.links![0].key,
    });
    await trackLead({ clickId });

    await ctx.expectNotSentTo(partner);
  });
});
