import { EnrolledPartnerProps } from "@/lib/types";
import { Campaign } from "@dub/prisma/client";
import { prisma } from "@dub/prisma";
import { describe, expect, test, onTestFinished } from "vitest";
import { randomEmail } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_PARTNER, E2E_PROGRAM } from "../utils/resource";
import { verifyCampaignSent } from "./utils/verify-campaign-sent";

describe.sequential("Workflow - SendCampaign", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();
  const programId = E2E_PROGRAM.id;

  const testPartner = E2E_PARTNER;

  test("Workflow executes when partner enrolled - campaign sent", async () => {
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
          attribute: "partnerJoined",
          operator: "gte",
          value: 0,
        },
      },
    });

    expect(updateStatus).toEqual(200);

    const { status: publishStatus } = await http.patch<Campaign>({
      path: `/campaigns/${campaignId}`,
      body: {
        status: "active",
      },
    });

    expect(publishStatus).toEqual(200);

    const partnerId = testPartner.id;

    const enrollment = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
    });

    if (!enrollment) {
      console.warn(
        `Skipping test: E2E partner ${partnerId} not enrolled in program ${programId}. E2E seed may need updating.`,
      );
      return;
    }

    const workflow = await prisma.workflow.findFirst({
      where: { campaign: { id: campaignId } },
    });

    expect(workflow).not.toBeNull();

    const cronResponse = await fetch(
      `${http.baseUrl.replace("/api", "")}/api/cron/workflows/${workflow!.id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      },
    );

    expect(cronResponse.status).toBe(200);

    await verifyCampaignSent({
      campaignId,
      partnerId,
    });
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

    const { status: updateStatus } = await http.patch<Campaign>({
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
          attribute: "partnerJoined",
          operator: "gte",
          value: 0,
        },
      },
    });

    expect(updateStatus).toEqual(200);

    const { status: partnerStatus, data: partner } = await http.post<
      EnrolledPartnerProps
    >({
      path: "/partners",
      body: {
        name: "E2E Draft Campaign Partner",
        email: randomEmail(),
      },
    });

    expect(partnerStatus).toEqual(201);

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const emailSent = await prisma.notificationEmail.findFirst({
      where: {
        campaignId,
        type: "Campaign",
        partnerId: partner.id,
      },
    });

    expect(emailSent).toBeNull();
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
          attribute: "partnerJoined",
          operator: "gte",
          value: 0,
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

    const { status: partnerStatus, data: partner } = await http.post<
      EnrolledPartnerProps
    >({
      path: "/partners",
      body: {
        name: "E2E Disabled Campaign Partner",
        email: randomEmail(),
      },
    });

    expect(partnerStatus).toEqual(201);

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const emailSent = await prisma.notificationEmail.findFirst({
      where: {
        campaignId,
        type: "Campaign",
        partnerId: partner.id,
      },
    });

    expect(emailSent).toBeNull();
  });

  test("No duplicate emails to same partner", async () => {
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
        name: "E2E No Duplicate Campaign",
        subject: "Welcome!",
        bodyJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Welcome message" }],
            },
          ],
        },
        triggerCondition: {
          attribute: "partnerJoined",
          operator: "gte",
          value: 0,
        },
        status: "active",
      },
    });

    const partnerId = testPartner.id;

    const enrollment = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
    });

    if (!enrollment) {
      console.warn(`Skipping test: Partner not enrolled in program`);
      return;
    }

    const workflow = await prisma.workflow.findFirst({
      where: { campaign: { id: campaignId } },
    });

    expect(workflow).not.toBeNull();

    const cronResponse = await fetch(
      `${http.baseUrl.replace("/api", "")}/api/cron/workflows/${workflow!.id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      },
    );

    expect(cronResponse.status).toBe(200);

    await verifyCampaignSent({
      campaignId,
      partnerId,
    });

    const cronResponse2 = await fetch(
      `${http.baseUrl.replace("/api", "")}/api/cron/workflows/${workflow!.id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      },
    );

    expect(cronResponse2.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const allEmails = await prisma.notificationEmail.findMany({
      where: {
        campaignId,
        type: "Campaign",
        partnerId,
      },
    });

    expect(allEmails).toHaveLength(1);
  });
});
