import { EnrolledPartnerProps } from "@/lib/types";
import { prisma } from "../utils/prisma";
import { Campaign } from "@dub/prisma/client";
import { subHours } from "date-fns";
import { describe, expect, test, onTestFinished } from "vitest";
import { randomEmail } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_PROGRAM, E2E_USER_ID } from "../utils/resource";

async function callCronWorkflow(baseUrl: string, workflowId: string) {
  const response = await fetch(`${baseUrl}/api/cron/workflows/${workflowId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  return {
    status: response.status,
    body: await response.text(),
  };
}

describe.sequential("Workflow - SendCampaign", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("Workflow is created when transactional campaign is published", async () => {
    const { status: createStatus, data: campaign } = await http.post<{
      id: string;
    }>({
      path: "/campaigns",
      body: {
        type: "transactional",
      },
    });

    expect(createStatus).toEqual(201);
    expect(campaign.id).toBeDefined();

    const campaignId = campaign.id;

    onTestFinished(async () => {
      await h.deleteCampaign(campaignId);
    });

    const { status: updateStatus } = await http.patch<Campaign>({
      path: `/campaigns/${campaignId}`,
      body: {
        name: "E2E Test Campaign",
        subject: "Welcome to our program!",
        bodyJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Thank you for joining!",
                },
              ],
            },
          ],
        },
        triggerCondition: {
          attribute: "partnerEnrolledDays",
          operator: "gte",
          value: 1,
        },
      },
    });

    expect(updateStatus).toEqual(200);

    const { status: publishStatus, data: publishedCampaign } = await http.patch<Campaign>({
      path: `/campaigns/${campaignId}`,
      body: {
        status: "active",
      },
    });

    expect(publishStatus).toEqual(200);
    expect(publishedCampaign.status).toBe("active");

    const workflow = await prisma.workflow.findFirst({
      where: { campaign: { id: campaignId } },
    });

    expect(workflow).not.toBeNull();
    expect(workflow?.trigger).toBe("partnerEnrolled");
    expect(workflow?.disabledAt).toBeNull();

    const workflowActions = workflow?.actions as any[];
    expect(workflowActions[0].type).toBe("sendCampaign");
    expect(workflowActions[0].data.campaignId).toBe(campaignId);
  });

  test("Workflow doesn't execute when campaign is in draft", async () => {
    const { status: createStatus, data: campaign } = await http.post<{
      id: string;
    }>({
      path: "/campaigns",
      body: {
        type: "transactional",
      },
    });

    expect(createStatus).toEqual(201);

    const campaignId = campaign.id;

    onTestFinished(async () => {
      await h.deleteCampaign(campaignId);
    });

    const { status: updateStatus, data: updatedCampaign } = await http.patch<Campaign>({
      path: `/campaigns/${campaignId}`,
      body: {
        name: "E2E Draft Campaign",
        subject: "This should not be sent",
        bodyJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Draft content",
                },
              ],
            },
          ],
        },
        triggerCondition: {
          attribute: "partnerEnrolledDays",
          operator: "gte",
          value: 1,
        },
      },
    });

    expect(updateStatus).toEqual(200);
    expect(updatedCampaign.status).toBe("draft");

    const workflow = await prisma.workflow.findFirst({
      where: { campaign: { id: campaignId } },
    });

    expect(workflow).not.toBeNull();
    expect(workflow?.disabledAt).not.toBeNull();
  });

  test("Cron executes send campaign workflow", async () => {
    const { status: createStatus, data: campaign } = await http.post<{
      id: string;
    }>({
      path: "/campaigns",
      body: {
        type: "transactional",
      },
    });

    expect(createStatus).toEqual(201);

    const campaignId = campaign.id;

    onTestFinished(async () => {
      await h.deleteCampaign(campaignId);
    });

    await http.patch({
      path: `/campaigns/${campaignId}`,
      body: {
        name: "E2E Cron Campaign",
        subject: "Welcome!",
        bodyJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Test content" }],
            },
          ],
        },
        triggerCondition: {
          attribute: "partnerEnrolledDays",
          operator: "gte",
          value: 1,
        },
        status: "active",
      },
    });

    const workflow = await prisma.workflow.findFirst({
      where: { campaign: { id: campaignId } },
    });

    expect(workflow).not.toBeNull();

    const { status, body } = await callCronWorkflow(h.baseUrl, workflow!.id);

    expect(status).toEqual(200);
    expect(body).toContain("Finished executing workflow");
  });

  test("Cron skips disabled send campaign workflow", async () => {
    const { status: createStatus, data: campaign } = await http.post<{
      id: string;
    }>({
      path: "/campaigns",
      body: {
        type: "transactional",
      },
    });

    expect(createStatus).toEqual(201);

    const campaignId = campaign.id;

    onTestFinished(async () => {
      await h.deleteCampaign(campaignId);
    });

    await http.patch({
      path: `/campaigns/${campaignId}`,
      body: {
        name: "E2E Disabled Cron Campaign",
        subject: "Should not be sent",
        bodyJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Test" }],
            },
          ],
        },
        triggerCondition: {
          attribute: "partnerEnrolledDays",
          operator: "gte",
          value: 1,
        },
        status: "active",
      },
    });

    const workflow = await prisma.workflow.findFirst({
      where: { campaign: { id: campaignId } },
    });

    expect(workflow).not.toBeNull();

    await prisma.workflow.update({
      where: { id: workflow!.id },
      data: { disabledAt: new Date() },
    });

    const { status, body } = await callCronWorkflow(h.baseUrl, workflow!.id);

    expect(status).toEqual(200);
    expect(body).toContain("disabled");

    const emailsSent = await prisma.notificationEmail.findMany({
      where: {
        campaignId,
        type: "Campaign",
      },
    });

    expect(emailsSent).toHaveLength(0);
  });

  test("Cron processes eligible partner enrollment", async () => {
    const { status: createStatus, data: campaign } = await http.post<{
      id: string;
    }>({
      path: "/campaigns",
      body: {
        type: "transactional",
      },
    });

    expect(createStatus).toEqual(201);

    const campaignId = campaign.id;

    onTestFinished(async () => {
      await h.deleteCampaign(campaignId);
    });

    await http.patch({
      path: `/campaigns/${campaignId}`,
      body: {
        name: "E2E Send Campaign",
        subject: "Welcome partner!",
        bodyJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Hello!" }],
            },
          ],
        },
        triggerCondition: {
          attribute: "partnerEnrolledDays",
          operator: "gte",
          value: 1,
        },
        status: "active",
      },
    });

    const workflow = await prisma.workflow.findFirst({
      where: { campaign: { id: campaignId } },
    });

    expect(workflow).not.toBeNull();

    const { status: partnerStatus, data: partner } = await http.post<
      EnrolledPartnerProps
    >({
      path: "/partners",
      body: {
        name: "E2E Test Partner - Campaign Send",
        email: randomEmail(),
      },
    });

    expect(partnerStatus).toEqual(201);

    const programId = E2E_PROGRAM.id;

    await prisma.programEnrollment.update({
      where: {
        partnerId_programId: {
          partnerId: partner.id,
          programId,
        },
      },
      data: { createdAt: subHours(new Date(), 18) },
    });

    const { status, body } = await callCronWorkflow(h.baseUrl, workflow!.id);

    expect(status).toEqual(200);
    expect(body).toContain("Finished executing workflow");
  });

  test("Cron doesn't send campaign when partner doesn't meet conditions", async () => {
    const { status: createStatus, data: campaign } = await http.post<{
      id: string;
    }>({
      path: "/campaigns",
      body: {
        type: "transactional",
      },
    });

    expect(createStatus).toEqual(201);

    const campaignId = campaign.id;

    onTestFinished(async () => {
      await h.deleteCampaign(campaignId);
    });

    await http.patch({
      path: `/campaigns/${campaignId}`,
      body: {
        name: "E2E No Match Campaign",
        subject: "Should not be sent",
        bodyJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Test" }],
            },
          ],
        },
        triggerCondition: {
          attribute: "partnerEnrolledDays",
          operator: "gte",
          value: 1,
        },
        status: "active",
      },
    });

    const workflow = await prisma.workflow.findFirst({
      where: { campaign: { id: campaignId } },
    });

    expect(workflow).not.toBeNull();

    const { status: partnerStatus, data: partner } = await http.post<
      EnrolledPartnerProps
    >({
      path: "/partners",
      body: {
        name: "E2E Test Partner - No Match",
        email: randomEmail(),
      },
    });

    expect(partnerStatus).toEqual(201);

    const { status, body } = await callCronWorkflow(h.baseUrl, workflow!.id);

    expect(status).toEqual(200);
    expect(body).toContain("Finished executing workflow");

    const emailSent = await prisma.notificationEmail.findFirst({
      where: {
        campaignId,
        type: "Campaign",
        partnerId: partner.id,
      },
    });

    expect(emailSent).toBeNull();
  });

  test("No duplicate campaign sends on multiple cron executions", async () => {
    const { status: createStatus, data: campaign } = await http.post<{
      id: string;
    }>({
      path: "/campaigns",
      body: {
        type: "transactional",
      },
    });

    expect(createStatus).toEqual(201);

    const campaignId = campaign.id;

    onTestFinished(async () => {
      await prisma.notificationEmail.deleteMany({
        where: { campaignId, type: "Campaign" },
      });
      await h.deleteCampaign(campaignId);
    });

    await http.patch({
      path: `/campaigns/${campaignId}`,
      body: {
        name: "E2E No Dup Campaign",
        subject: "No duplicates!",
        bodyJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Hello!" }],
            },
          ],
        },
        triggerCondition: {
          attribute: "partnerEnrolledDays",
          operator: "gte",
          value: 1,
        },
        status: "active",
      },
    });

    const workflow = await prisma.workflow.findFirst({
      where: { campaign: { id: campaignId } },
    });

    expect(workflow).not.toBeNull();

    const { status: partnerStatus, data: partner } = await http.post<
      EnrolledPartnerProps
    >({
      path: "/partners",
      body: {
        name: "E2E Test Partner - No Dup Campaign",
        email: randomEmail(),
      },
    });

    expect(partnerStatus).toEqual(201);

    const programId = E2E_PROGRAM.id;

    await prisma.programEnrollment.update({
      where: {
        partnerId_programId: {
          partnerId: partner.id,
          programId,
        },
      },
      data: { createdAt: subHours(new Date(), 18) },
    });

    const existingEmail = await prisma.notificationEmail.create({
      data: {
        id: `em_e2e_dedup_${Date.now()}`,
        type: "Campaign",
        emailId: `resend_e2e_dedup_${Date.now()}`,
        campaignId,
        programId,
        partnerId: partner.id,
        recipientUserId: E2E_USER_ID,
      },
    });

    expect(existingEmail).not.toBeNull();

    const { status, body } = await callCronWorkflow(h.baseUrl, workflow!.id);

    expect(status).toEqual(200);
    expect(body).toContain("Finished executing workflow");

    const emails = await prisma.notificationEmail.findMany({
      where: {
        campaignId,
        type: "Campaign",
        partnerId: partner.id,
      },
    });

    expect(emails).toHaveLength(1);
    expect(emails[0].id).toBe(existingEmail.id);
  });

  test("Campaign workflow configuration can be updated", async () => {
    const { status: createStatus, data: campaign } = await http.post<{
      id: string;
    }>({
      path: "/campaigns",
      body: {
        type: "transactional",
      },
    });

    expect(createStatus).toEqual(201);

    const campaignId = campaign.id;

    onTestFinished(async () => {
      await h.deleteCampaign(campaignId);
    });

    await http.patch({
      path: `/campaigns/${campaignId}`,
      body: {
        name: "E2E Campaign Config Test",
        subject: "Test",
        bodyJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Test" }],
            },
          ],
        },
        triggerCondition: {
          attribute: "partnerEnrolledDays",
          operator: "gte",
          value: 1,
        },
        status: "active",
      },
    });

    let workflow = await prisma.workflow.findFirst({
      where: { campaign: { id: campaignId } },
    });

    expect(workflow).not.toBeNull();
    const conditions1 = workflow?.triggerConditions as any[];
    expect(conditions1[0].value).toBe(1);

    const { status: pauseStatus, data: pausedCampaign } = await http.patch<Campaign>({
      path: `/campaigns/${campaignId}`,
      body: {
        status: "paused",
      },
    });

    expect(pauseStatus).toEqual(200);
    expect(pausedCampaign.status).toBe("paused");

    const pausedWorkflow = await prisma.workflow.findUnique({
      where: { id: workflow!.id },
      select: { disabledAt: true },
    });

    expect(pausedWorkflow?.disabledAt).not.toBeNull();
  });
});

