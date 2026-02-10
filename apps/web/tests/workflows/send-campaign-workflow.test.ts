import { prisma } from "@dub/prisma";
import { Campaign } from "@dub/prisma/client";
import { describe, expect, test, onTestFinished } from "vitest";
import { IntegrationHarness } from "../utils/integration";

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

  test("Disabled workflow doesn't send campaign", async () => {
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
        name: "E2E Disabled Campaign",
        subject: "This should not be sent",
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
    expect(workflow?.disabledAt).toBeNull();

    await prisma.workflow.update({
      where: { id: workflow!.id },
      data: { disabledAt: new Date() },
    });

    const disabledWorkflow = await prisma.workflow.findUnique({
      where: { id: workflow!.id },
      select: { disabledAt: true },
    });

    expect(disabledWorkflow?.disabledAt).not.toBeNull();
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

