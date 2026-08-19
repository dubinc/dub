import { prisma } from "@/lib/prisma";
import { expect } from "@playwright/test";
import { test } from "../fixtures";
import { createCampaign, createPartnerTag, deletePartnerTag } from "./helpers";
import {
  backdateEnrollment,
  campaignEmails,
  cleanupCampaign,
  createPartnerMailbox,
  createTestCommission,
  createTestGroup,
  createTestPartner,
  deleteTestGroup,
  deleteTestPartner,
  enrolledDaysCondition,
  expectCampaignEmailCount,
  getCampaignWorkflow,
  insertCampaignEmail,
  publishTransactionalCampaign,
  runPartnerCampaignWorkflow,
  runScheduledCampaignWorkflow,
  setEnrollmentStatus,
  setLinkStats,
  tagPartner,
} from "./send-campaign-workflow-helpers";

test("transactional draft workflow is disabled", async ({ api }) => {
  let campaignId: string | undefined;

  try {
    const { status, data } = await createCampaign(api);
    expect(status).toEqual(201);
    campaignId = data.id;

    const workflow = await getCampaignWorkflow(campaignId);
    expect(workflow.disabledAt).not.toBeNull();
    expect(workflow.actions).toEqual([
      {
        type: "sendCampaign",
        data: { campaignId },
      },
    ]);
  } finally {
    await cleanupCampaign(api, campaignId);
  }
});

test("publishing a transactional campaign enables the workflow", async ({
  api,
}) => {
  let campaignId: string | undefined;

  try {
    campaignId = await publishTransactionalCampaign(api);
    const workflow = await getCampaignWorkflow(campaignId);

    expect(workflow.disabledAt).toBeNull();
    expect(workflow.triggerConditions).toEqual([enrolledDaysCondition]);
    expect(workflow.actions).toEqual([
      {
        type: "sendCampaign",
        data: { campaignId },
      },
    ]);
  } finally {
    await cleanupCampaign(api, campaignId);
  }
});

test("pausing a campaign disables the workflow", async ({ api }) => {
  let campaignId: string | undefined;

  try {
    campaignId = await publishTransactionalCampaign(api);

    const paused = await api.patch(`/api/campaigns/${campaignId}`, {
      status: "paused",
    });
    expect(paused.status).toEqual(200);

    const workflow = await getCampaignWorkflow(campaignId);
    expect(workflow.disabledAt).not.toBeNull();
  } finally {
    await cleanupCampaign(api, campaignId);
  }
});

test("scheduled run skips a disabled workflow", async ({ api, program }) => {
  let campaignId: string | undefined;
  let partnerId: string | undefined;

  try {
    campaignId = await publishTransactionalCampaign(api);
    const partner = await createTestPartner(api);
    partnerId = partner.id;
    await createPartnerMailbox(partnerId);
    await backdateEnrollment({
      partnerId,
      programId: program.id,
      hoursAgo: 18,
    });

    const workflow = await getCampaignWorkflow(campaignId);
    await prisma.workflow.update({
      where: { id: workflow.id },
      data: { disabledAt: new Date() },
    });

    expect(await runScheduledCampaignWorkflow(api, workflow.id)).toEqual(
      "disabled",
    );
    await expectCampaignEmailCount({ campaignId, partnerId, count: 0 });
  } finally {
    await deleteTestPartner(partnerId);
    await cleanupCampaign(api, campaignId);
  }
});

test("scheduled window only includes enrollments from 12–24h ago", async ({
  api,
  program,
}) => {
  let campaignId: string | undefined;
  const partnerIds: string[] = [];

  try {
    campaignId = await publishTransactionalCampaign(api);

    for (const hoursAgo of [6, 18, 30]) {
      const partner = await createTestPartner(api);
      partnerIds.push(partner.id);
      await createPartnerMailbox(partner.id);
      await backdateEnrollment({
        partnerId: partner.id,
        programId: program.id,
        hoursAgo,
      });
    }

    const workflow = await getCampaignWorkflow(campaignId);
    expect(await runScheduledCampaignWorkflow(api, workflow.id)).toEqual(
      "finished",
    );

    await expectCampaignEmailCount({
      campaignId,
      partnerId: partnerIds[0],
      count: 0,
    });
    await expectCampaignEmailCount({
      campaignId,
      partnerId: partnerIds[1],
      count: 1,
    });
    await expectCampaignEmailCount({
      campaignId,
      partnerId: partnerIds[2],
      count: 0,
    });
  } finally {
    for (const partnerId of partnerIds) {
      await deleteTestPartner(partnerId);
    }
    await cleanupCampaign(api, campaignId);
  }
});

test("scheduled run skips eligible partners without a partner user", async ({
  api,
  program,
}) => {
  let campaignId: string | undefined;
  let partnerId: string | undefined;

  try {
    campaignId = await publishTransactionalCampaign(api);
    const partner = await createTestPartner(api);
    partnerId = partner.id;
    await backdateEnrollment({
      partnerId,
      programId: program.id,
      hoursAgo: 18,
    });

    const workflow = await getCampaignWorkflow(campaignId);
    expect(await runScheduledCampaignWorkflow(api, workflow.id)).toEqual(
      "finished",
    );
    await expectCampaignEmailCount({ campaignId, partnerId, count: 0 });
  } finally {
    await deleteTestPartner(partnerId);
    await cleanupCampaign(api, campaignId);
  }
});

test("scheduled run does not send duplicate campaign emails", async ({
  api,
  program,
}) => {
  let campaignId: string | undefined;
  let partnerId: string | undefined;

  try {
    campaignId = await publishTransactionalCampaign(api);
    const partner = await createTestPartner(api);
    partnerId = partner.id;
    await createPartnerMailbox(partnerId);
    await backdateEnrollment({
      partnerId,
      programId: program.id,
      hoursAgo: 18,
    });

    const workflow = await getCampaignWorkflow(campaignId);
    expect(await runScheduledCampaignWorkflow(api, workflow.id)).toEqual(
      "finished",
    );
    expect(await runScheduledCampaignWorkflow(api, workflow.id)).toEqual(
      "finished",
    );

    const emails = await expectCampaignEmailCount({
      campaignId,
      partnerId,
      count: 1,
    });
    expect(emails[0].type).toEqual("Campaign");
  } finally {
    await deleteTestPartner(partnerId);
    await cleanupCampaign(api, campaignId);
  }
});

test("scheduled run skips partners who already received the campaign", async ({
  api,
  program,
}) => {
  let campaignId: string | undefined;
  let partnerId: string | undefined;

  try {
    campaignId = await publishTransactionalCampaign(api);
    const partner = await createTestPartner(api);
    partnerId = partner.id;
    const userId = await createPartnerMailbox(partnerId);
    await backdateEnrollment({
      partnerId,
      programId: program.id,
      hoursAgo: 18,
    });

    const existing = await insertCampaignEmail({
      campaignId,
      programId: program.id,
      partnerId,
      recipientUserId: userId,
    });

    const workflow = await getCampaignWorkflow(campaignId);
    expect(await runScheduledCampaignWorkflow(api, workflow.id)).toEqual(
      "finished",
    );

    const emails = await campaignEmails(campaignId, partnerId);
    expect(emails).toHaveLength(1);
    expect(emails[0].id).toEqual(existing.id);
  } finally {
    await deleteTestPartner(partnerId);
    await cleanupCampaign(api, campaignId);
  }
});

test("scheduled AND sends when enrollment window and leads match", async ({
  api,
  program,
}) => {
  let campaignId: string | undefined;
  let partnerId: string | undefined;

  try {
    campaignId = await publishTransactionalCampaign(api, {
      triggerConditions: [
        enrolledDaysCondition,
        { attribute: "totalLeads", operator: "gte", value: 1 },
      ],
    });

    const partner = await createTestPartner(api);
    partnerId = partner.id;
    await createPartnerMailbox(partnerId);
    await backdateEnrollment({
      partnerId,
      programId: program.id,
      hoursAgo: 18,
    });
    await setLinkStats({
      partnerId,
      programId: program.id,
      leads: 1,
    });

    const workflow = await getCampaignWorkflow(campaignId);
    expect(await runScheduledCampaignWorkflow(api, workflow.id)).toEqual(
      "finished",
    );
    await expectCampaignEmailCount({ campaignId, partnerId, count: 1 });
  } finally {
    await deleteTestPartner(partnerId);
    await cleanupCampaign(api, campaignId);
  }
});

test("scheduled AND does not send when the metric condition fails", async ({
  api,
  program,
}) => {
  let campaignId: string | undefined;
  let partnerId: string | undefined;

  try {
    campaignId = await publishTransactionalCampaign(api, {
      triggerConditions: [
        enrolledDaysCondition,
        { attribute: "totalLeads", operator: "gte", value: 1 },
      ],
    });

    const partner = await createTestPartner(api);
    partnerId = partner.id;
    await createPartnerMailbox(partnerId);
    await backdateEnrollment({
      partnerId,
      programId: program.id,
      hoursAgo: 18,
    });

    const workflow = await getCampaignWorkflow(campaignId);
    expect(await runScheduledCampaignWorkflow(api, workflow.id)).toEqual(
      "finished",
    );
    await expectCampaignEmailCount({ campaignId, partnerId, count: 0 });
  } finally {
    await deleteTestPartner(partnerId);
    await cleanupCampaign(api, campaignId);
  }
});

test("scheduled AND sends when totalLeads lte 0", async ({ api, program }) => {
  let campaignId: string | undefined;
  let partnerId: string | undefined;

  try {
    campaignId = await publishTransactionalCampaign(api, {
      triggerConditions: [
        enrolledDaysCondition,
        { attribute: "totalLeads", operator: "lte", value: 0 },
      ],
    });

    const partner = await createTestPartner(api);
    partnerId = partner.id;
    await createPartnerMailbox(partnerId);
    await backdateEnrollment({
      partnerId,
      programId: program.id,
      hoursAgo: 18,
    });

    const workflow = await getCampaignWorkflow(campaignId);
    expect(await runScheduledCampaignWorkflow(api, workflow.id)).toEqual(
      "finished",
    );
    await expectCampaignEmailCount({ campaignId, partnerId, count: 1 });
  } finally {
    await deleteTestPartner(partnerId);
    await cleanupCampaign(api, campaignId);
  }
});

const scheduledMetricCases = [
  {
    name: "totalConversions",
    condition: {
      attribute: "totalConversions",
      operator: "gte",
      value: 1,
    },
    stats: { conversions: 1 },
  },
  {
    name: "totalSaleAmount",
    condition: {
      attribute: "totalSaleAmount",
      operator: "gte",
      value: 100,
    },
    stats: { saleAmount: 100 },
  },
] as const;

for (const { name, condition, stats } of scheduledMetricCases) {
  test(`scheduled AND sends when ${name} matches`, async ({ api, program }) => {
    let campaignId: string | undefined;
    let partnerId: string | undefined;

    try {
      campaignId = await publishTransactionalCampaign(api, {
        triggerConditions: [enrolledDaysCondition, condition],
      });

      const partner = await createTestPartner(api);
      partnerId = partner.id;
      await createPartnerMailbox(partnerId);
      await backdateEnrollment({
        partnerId,
        programId: program.id,
        hoursAgo: 18,
      });
      await setLinkStats({
        partnerId,
        programId: program.id,
        ...stats,
      });

      const workflow = await getCampaignWorkflow(campaignId);
      expect(await runScheduledCampaignWorkflow(api, workflow.id)).toEqual(
        "finished",
      );
      await expectCampaignEmailCount({ campaignId, partnerId, count: 1 });
    } finally {
      await deleteTestPartner(partnerId);
      await cleanupCampaign(api, campaignId);
    }
  });
}

test("scheduled AND sends when totalCommissions matches", async ({
  api,
  program,
}) => {
  let campaignId: string | undefined;
  let partnerId: string | undefined;

  try {
    campaignId = await publishTransactionalCampaign(api, {
      triggerConditions: [
        enrolledDaysCondition,
        { attribute: "totalCommissions", operator: "gte", value: 1 },
      ],
    });

    const partner = await createTestPartner(api);
    partnerId = partner.id;
    await createPartnerMailbox(partnerId);
    await backdateEnrollment({
      partnerId,
      programId: program.id,
      hoursAgo: 18,
    });
    await createTestCommission({
      programId: program.id,
      partnerId,
      earnings: 500,
    });

    const workflow = await getCampaignWorkflow(campaignId);
    expect(await runScheduledCampaignWorkflow(api, workflow.id)).toEqual(
      "finished",
    );
    await expectCampaignEmailCount({ campaignId, partnerId, count: 1 });
  } finally {
    await deleteTestPartner(partnerId);
    await cleanupCampaign(api, campaignId);
  }
});

test("partnerJoined sends on partnerEnrolled and not on the scheduled runner", async ({
  api,
}) => {
  let campaignId: string | undefined;
  let partnerId: string | undefined;

  try {
    campaignId = await publishTransactionalCampaign(api, {
      triggerConditions: [
        { attribute: "partnerJoined", operator: "gte", value: 0 },
      ],
    });

    const partner = await createTestPartner(api);
    partnerId = partner.id;
    await createPartnerMailbox(partnerId);

    const workflow = await getCampaignWorkflow(campaignId);
    expect(await runScheduledCampaignWorkflow(api, workflow.id)).toEqual(
      "finished",
    );
    await expectCampaignEmailCount({ campaignId, partnerId, count: 0 });

    expect(
      await runPartnerCampaignWorkflow(api, workflow.id, partnerId),
    ).toEqual("finished");

    await expectCampaignEmailCount({ campaignId, partnerId, count: 1 });
  } finally {
    await deleteTestPartner(partnerId);
    await cleanupCampaign(api, campaignId);
  }
});

test("leadRecorded sends when totalLeads matches and skips when it does not", async ({
  api,
  program,
}) => {
  let campaignId: string | undefined;
  let matchId: string | undefined;
  let missId: string | undefined;

  try {
    campaignId = await publishTransactionalCampaign(api, {
      triggerConditions: [
        { attribute: "totalLeads", operator: "gte", value: 1 },
      ],
    });

    const match = await createTestPartner(api);
    matchId = match.id;
    await createPartnerMailbox(matchId);
    await setLinkStats({
      partnerId: matchId,
      programId: program.id,
      leads: 1,
    });

    const miss = await createTestPartner(api);
    missId = miss.id;
    await createPartnerMailbox(missId);

    const workflow = await getCampaignWorkflow(campaignId);
    expect(await runPartnerCampaignWorkflow(api, workflow.id, matchId)).toEqual(
      "finished",
    );
    expect(await runPartnerCampaignWorkflow(api, workflow.id, missId)).toEqual(
      "finished",
    );

    await expectCampaignEmailCount({
      campaignId,
      partnerId: matchId,
      count: 1,
    });
    await expectCampaignEmailCount({
      campaignId,
      partnerId: missId,
      count: 0,
    });
  } finally {
    await deleteTestPartner(matchId);
    await deleteTestPartner(missId);
    await cleanupCampaign(api, campaignId);
  }
});

test("saleRecorded sends when totalConversions matches", async ({
  api,
  program,
}) => {
  let campaignId: string | undefined;
  let partnerId: string | undefined;

  try {
    campaignId = await publishTransactionalCampaign(api, {
      triggerConditions: [
        { attribute: "totalConversions", operator: "gte", value: 1 },
      ],
    });

    const partner = await createTestPartner(api);
    partnerId = partner.id;
    await createPartnerMailbox(partnerId);
    await setLinkStats({
      partnerId,
      programId: program.id,
      conversions: 1,
    });

    const workflow = await getCampaignWorkflow(campaignId);
    expect(
      await runPartnerCampaignWorkflow(api, workflow.id, partnerId),
    ).toEqual("finished");

    await expectCampaignEmailCount({ campaignId, partnerId, count: 1 });
  } finally {
    await deleteTestPartner(partnerId);
    await cleanupCampaign(api, campaignId);
  }
});

test("commissionRecorded sends when totalCommissions matches", async ({
  api,
  program,
}) => {
  let campaignId: string | undefined;
  let partnerId: string | undefined;

  try {
    campaignId = await publishTransactionalCampaign(api, {
      triggerConditions: [
        { attribute: "totalCommissions", operator: "gte", value: 1 },
      ],
    });

    const partner = await createTestPartner(api);
    partnerId = partner.id;
    await createPartnerMailbox(partnerId);
    await createTestCommission({
      programId: program.id,
      partnerId,
      earnings: 250,
    });

    const workflow = await getCampaignWorkflow(campaignId);
    expect(
      await runPartnerCampaignWorkflow(api, workflow.id, partnerId),
    ).toEqual("finished");

    await expectCampaignEmailCount({ campaignId, partnerId, count: 1 });
  } finally {
    await deleteTestPartner(partnerId);
    await cleanupCampaign(api, campaignId);
  }
});

test("event runner skips disabled workflows", async ({ api }) => {
  let campaignId: string | undefined;
  let partnerId: string | undefined;

  try {
    campaignId = await publishTransactionalCampaign(api, {
      triggerConditions: [
        { attribute: "partnerJoined", operator: "gte", value: 0 },
      ],
    });

    const partner = await createTestPartner(api);
    partnerId = partner.id;
    await createPartnerMailbox(partnerId);

    const workflow = await getCampaignWorkflow(campaignId);
    await prisma.workflow.update({
      where: { id: workflow.id },
      data: { disabledAt: new Date() },
    });

    expect(
      await runPartnerCampaignWorkflow(api, workflow.id, partnerId),
    ).toEqual("disabled");

    await expectCampaignEmailCount({ campaignId, partnerId, count: 0 });
  } finally {
    await deleteTestPartner(partnerId);
    await cleanupCampaign(api, campaignId);
  }
});

test("group filter only sends to partners in selected groups", async ({
  api,
  program,
}) => {
  let campaignId: string | undefined;
  let groupId: string | undefined;
  let inGroupId: string | undefined;
  let outGroupId: string | undefined;

  try {
    groupId = await createTestGroup(api);
    campaignId = await publishTransactionalCampaign(api, {
      groupIds: [groupId],
    });

    const inGroup = await createTestPartner(api, { groupId });
    inGroupId = inGroup.id;
    await createPartnerMailbox(inGroupId);
    await backdateEnrollment({
      partnerId: inGroupId,
      programId: program.id,
      hoursAgo: 18,
    });

    const outGroup = await createTestPartner(api, {
      groupId: program.defaultGroupId,
    });
    outGroupId = outGroup.id;
    await createPartnerMailbox(outGroupId);
    await backdateEnrollment({
      partnerId: outGroupId,
      programId: program.id,
      hoursAgo: 18,
    });

    const workflow = await getCampaignWorkflow(campaignId);
    expect(await runScheduledCampaignWorkflow(api, workflow.id)).toEqual(
      "finished",
    );

    await expectCampaignEmailCount({
      campaignId,
      partnerId: inGroupId,
      count: 1,
    });
    await expectCampaignEmailCount({
      campaignId,
      partnerId: outGroupId,
      count: 0,
    });
  } finally {
    await deleteTestPartner(inGroupId);
    await deleteTestPartner(outGroupId);
    await cleanupCampaign(api, campaignId);
    await deleteTestGroup(api, groupId);
  }
});

test("partner tag filter only sends to tagged partners", async ({
  api,
  program,
}) => {
  let campaignId: string | undefined;
  let partnerTagId: string | undefined;
  let taggedId: string | undefined;
  let untaggedId: string | undefined;

  try {
    const tag = await createPartnerTag(program.id);
    partnerTagId = tag.id;
    campaignId = await publishTransactionalCampaign(api, {
      partnerTagIds: [tag.id],
    });

    const tagged = await createTestPartner(api);
    taggedId = tagged.id;
    await createPartnerMailbox(taggedId);
    await tagPartner({
      programId: program.id,
      partnerId: taggedId,
      partnerTagId: tag.id,
    });
    await backdateEnrollment({
      partnerId: taggedId,
      programId: program.id,
      hoursAgo: 18,
    });

    const untagged = await createTestPartner(api);
    untaggedId = untagged.id;
    await createPartnerMailbox(untaggedId);
    await backdateEnrollment({
      partnerId: untaggedId,
      programId: program.id,
      hoursAgo: 18,
    });

    const workflow = await getCampaignWorkflow(campaignId);
    expect(await runScheduledCampaignWorkflow(api, workflow.id)).toEqual(
      "finished",
    );

    await expectCampaignEmailCount({
      campaignId,
      partnerId: taggedId,
      count: 1,
    });
    await expectCampaignEmailCount({
      campaignId,
      partnerId: untaggedId,
      count: 0,
    });
  } finally {
    await deleteTestPartner(taggedId);
    await deleteTestPartner(untaggedId);
    await cleanupCampaign(api, campaignId);
    await deletePartnerTag(partnerTagId);
  }
});

test("group and tag filters both have to match", async ({ api, program }) => {
  let campaignId: string | undefined;
  let groupId: string | undefined;
  let partnerTagId: string | undefined;
  let partnerId: string | undefined;

  try {
    groupId = await createTestGroup(api);
    const tag = await createPartnerTag(program.id);
    partnerTagId = tag.id;
    campaignId = await publishTransactionalCampaign(api, {
      groupIds: [groupId],
      partnerTagIds: [tag.id],
    });

    const partner = await createTestPartner(api, { groupId });
    partnerId = partner.id;
    await createPartnerMailbox(partnerId);
    await backdateEnrollment({
      partnerId,
      programId: program.id,
      hoursAgo: 18,
    });

    const workflow = await getCampaignWorkflow(campaignId);
    expect(await runScheduledCampaignWorkflow(api, workflow.id)).toEqual(
      "finished",
    );
    await expectCampaignEmailCount({ campaignId, partnerId, count: 0 });

    await tagPartner({
      programId: program.id,
      partnerId,
      partnerTagId: tag.id,
    });
    expect(await runScheduledCampaignWorkflow(api, workflow.id)).toEqual(
      "finished",
    );
    await expectCampaignEmailCount({ campaignId, partnerId, count: 1 });
  } finally {
    await deleteTestPartner(partnerId);
    await cleanupCampaign(api, campaignId);
    await deletePartnerTag(partnerTagId);
    await deleteTestGroup(api, groupId);
  }
});

test("non-approved enrollments are not sent", async ({ api, program }) => {
  let campaignId: string | undefined;
  let partnerId: string | undefined;

  try {
    campaignId = await publishTransactionalCampaign(api);
    const partner = await createTestPartner(api);
    partnerId = partner.id;
    await createPartnerMailbox(partnerId);
    await backdateEnrollment({
      partnerId,
      programId: program.id,
      hoursAgo: 18,
    });
    await setEnrollmentStatus({
      partnerId,
      programId: program.id,
      status: "pending",
    });

    const workflow = await getCampaignWorkflow(campaignId);
    expect(await runScheduledCampaignWorkflow(api, workflow.id)).toEqual(
      "finished",
    );
    await expectCampaignEmailCount({ campaignId, partnerId, count: 0 });
  } finally {
    await deleteTestPartner(partnerId);
    await cleanupCampaign(api, campaignId);
  }
});

test("draft and paused campaigns do not send", async ({ api, program }) => {
  let draftId: string | undefined;
  let pausedId: string | undefined;
  let partnerId: string | undefined;

  try {
    const { data: draft } = await createCampaign(api);
    draftId = draft.id;
    await api.patch(`/api/campaigns/${draftId}`, {
      triggerConditions: [enrolledDaysCondition],
    });

    pausedId = await publishTransactionalCampaign(api);
    await api.patch(`/api/campaigns/${pausedId}`, { status: "paused" });

    const partner = await createTestPartner(api);
    partnerId = partner.id;
    await createPartnerMailbox(partnerId);
    await backdateEnrollment({
      partnerId,
      programId: program.id,
      hoursAgo: 18,
    });

    const draftWorkflow = await getCampaignWorkflow(draftId);
    const pausedWorkflow = await getCampaignWorkflow(pausedId);

    expect(await runScheduledCampaignWorkflow(api, draftWorkflow.id)).toEqual(
      "disabled",
    );
    expect(await runScheduledCampaignWorkflow(api, pausedWorkflow.id)).toEqual(
      "disabled",
    );

    await expectCampaignEmailCount({
      campaignId: draftId,
      partnerId,
      count: 0,
    });
    await expectCampaignEmailCount({
      campaignId: pausedId,
      partnerId,
      count: 0,
    });
  } finally {
    await deleteTestPartner(partnerId);
    await cleanupCampaign(api, draftId);
    await cleanupCampaign(api, pausedId);
  }
});
