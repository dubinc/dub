import { Campaign, EnrolledPartnerProps } from "@/lib/types";
import { subHours } from "date-fns";
import { describe, expect, onTestFinished, test } from "vitest";
import { randomEmail } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import {
  E2E_PARTNER_GROUP,
  E2E_USER_ID,
  E2E_WORKSPACE_ID,
} from "../utils/resource";

describe.sequential("Workflow - SendCampaign", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  const ws = (q: Record<string, string> = {}) => ({
    ...q,
    workspaceId: E2E_WORKSPACE_ID,
  });

  const getDefaultGroupId = async (): Promise<string> => {
    const { data: groups } = await http.get<{ id: string }[]>({
      path: "/groups",
      query: ws(),
    });
    if (!groups?.length) {
      return E2E_PARTNER_GROUP.id;
    }
    return groups[0].id;
  };

  test("Workflow is created when transactional campaign is published", async () => {
    const { status: createStatus, data: campaign } = await http.post<{
      id: string;
    }>({
      path: "/campaigns",
      query: ws(),
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
      query: ws(),
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

    const { status: publishStatus, data: publishedCampaign } =
      await http.patch<Campaign>({
        path: `/campaigns/${campaignId}`,
        query: ws(),
        body: {
          status: "active",
        },
      });

    expect(publishStatus).toEqual(200);
    expect(publishedCampaign.status).toBe("active");

    const { data: workflow } = await http.get<any>({
      path: "/e2e/workflows",
      query: ws({ campaignId }),
    });

    expect(workflow).not.toBeNull();
    expect(workflow.trigger).toBe("partnerEnrolled");
    expect(workflow.disabledAt).toBeNull();

    const workflowActions = workflow.actions as any[];
    expect(workflowActions[0].type).toBe("sendCampaign");
    expect(workflowActions[0].data.campaignId).toBe(campaignId);
  });

  test("Workflow doesn't execute when campaign is in draft", async () => {
    const { status: createStatus, data: campaign } = await http.post<{
      id: string;
    }>({
      path: "/campaigns",
      query: ws(),
      body: {
        type: "transactional",
      },
    });

    expect(createStatus).toEqual(201);

    const campaignId = campaign.id;

    onTestFinished(async () => {
      await h.deleteCampaign(campaignId);
    });

    const { status: updateStatus, data: updatedCampaign } =
      await http.patch<Campaign>({
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

    const { data: workflow } = await http.get<any>({
      path: "/e2e/workflows",
      query: ws({ campaignId }),
    });

    expect(workflow).not.toBeNull();
    expect(workflow.disabledAt).not.toBeNull();
  });

  test("Cron executes send campaign workflow", async () => {
    const { status: createStatus, data: campaign } = await http.post<{
      id: string;
    }>({
      path: "/campaigns",
      query: ws(),
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
      query: ws(),
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

    const { data: workflow } = await http.get<any>({
      path: "/e2e/workflows",
      query: ws({ campaignId }),
    });

    expect(workflow).not.toBeNull();

    const { status, data } = await http.post<{ message: string }>({
      path: `/e2e/trigger-workflow/${workflow.id}`,
      query: ws(),
    });

    expect(status).toEqual(200);
    expect(data.message).toContain("Finished executing workflow");
  });

  test("Cron skips disabled send campaign workflow", async () => {
    const { status: createStatus, data: campaign } = await http.post<{
      id: string;
    }>({
      path: "/campaigns",
      query: ws(),
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
      query: ws(),
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

    const { data: workflow } = await http.get<any>({
      path: "/e2e/workflows",
      query: ws({ campaignId }),
    });

    expect(workflow).not.toBeNull();

    // Disable workflow via E2E endpoint
    await http.patch({
      path: `/e2e/workflows/${workflow.id}`,
      query: ws(),
      body: { disabledAt: new Date().toISOString() },
    });

    const { status, data } = await http.post<{ message: string }>({
      path: `/e2e/trigger-workflow/${workflow.id}`,
      query: ws(),
    });

    expect(status).toEqual(200);
    expect(data.message).toContain("disabled");

    const { data: emailsSent } = await http.get<any[]>({
      path: "/e2e/notification-emails",
      query: ws({ campaignId }),
    });

    expect(emailsSent).toHaveLength(0);
  });

  test("Cron processes eligible partner enrollment", async () => {
    const { status: createStatus, data: campaign } = await http.post<{
      id: string;
    }>({
      path: "/campaigns",
      query: ws(),
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
      query: ws(),
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

    const { data: workflow } = await http.get<any>({
      path: "/e2e/workflows",
      query: ws({ campaignId }),
    });

    expect(workflow).not.toBeNull();

    const groupId = await getDefaultGroupId();
    const { status: partnerStatus, data: partner } =
      await http.post<EnrolledPartnerProps>({
        path: "/e2e/partners",
        query: ws(),
        body: {
          name: "E2E Test Partner - Campaign Send",
          email: randomEmail(),
          groupId,
        },
      });

    expect(partnerStatus).toEqual(201);

    // Backdate the enrollment to 18h ago so it falls in the cron window
    await http.patch({
      path: "/e2e/enrollments",
      query: ws(),
      body: {
        partnerId: partner.id,
        createdAt: subHours(new Date(), 18).toISOString(),
      },
    });

    const { status, data } = await http.post<{ message: string }>({
      path: `/e2e/trigger-workflow/${workflow.id}`,
      query: ws(),
    });

    expect(status).toEqual(200);
    expect(data.message).toContain("Finished executing workflow");
  });

  test("Cron doesn't send campaign when partner doesn't meet conditions", async () => {
    const { status: createStatus, data: campaign } = await http.post<{
      id: string;
    }>({
      path: "/campaigns",
      query: ws(),
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
      query: ws(),
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

    const { data: workflow } = await http.get<any>({
      path: "/e2e/workflows",
      query: ws({ campaignId }),
    });

    expect(workflow).not.toBeNull();

    const groupId = await getDefaultGroupId();
    // Create a partner enrolled just now — doesn't match the 12-24h window
    const { status: partnerStatus, data: partner } =
      await http.post<EnrolledPartnerProps>({
        path: "/e2e/partners",
        query: ws(),
        body: {
          name: "E2E Test Partner - No Match",
          email: randomEmail(),
          groupId,
        },
      });

    expect(partnerStatus).toEqual(201);

    const { status, data: triggerData } = await http.post<{ message: string }>({
      path: `/e2e/trigger-workflow/${workflow.id}`,
      query: ws(),
    });

    expect(status).toEqual(200);
    expect(triggerData.message).toContain("Finished executing workflow");

    const { data: emailsSent } = await http.get<any[]>({
      path: "/e2e/notification-emails",
      query: ws({ campaignId, partnerId: partner.id }),
    });

    expect(emailsSent).toHaveLength(0);
  });

  test("No duplicate campaign sends on multiple cron executions", async () => {
    const { status: createStatus, data: campaign } = await http.post<{
      id: string;
    }>({
      path: "/campaigns",
      query: ws(),
      body: {
        type: "transactional",
      },
    });

    expect(createStatus).toEqual(201);

    const campaignId = campaign.id;

    onTestFinished(async () => {
      await http.delete({
        path: "/e2e/notification-emails",
        query: ws({ campaignId }),
      });
      await h.deleteCampaign(campaignId);
    });

    await http.patch({
      path: `/campaigns/${campaignId}`,
      query: ws(),
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

    const { data: workflow } = await http.get<any>({
      path: "/e2e/workflows",
      query: ws({ campaignId }),
    });

    expect(workflow).not.toBeNull();

    const groupId = await getDefaultGroupId();
    const { status: partnerStatus, data: partner } =
      await http.post<EnrolledPartnerProps>({
        path: "/e2e/partners",
        query: ws(),
        body: {
          name: "E2E Test Partner - No Dup Campaign",
          email: randomEmail(),
          groupId,
        },
      });

    expect(partnerStatus).toEqual(201);

    // Backdate enrollment to match the cron window
    await http.patch({
      path: "/e2e/enrollments",
      query: ws(),
      body: {
        partnerId: partner.id,
        createdAt: subHours(new Date(), 18).toISOString(),
      },
    });

    // Pre-insert a notification email to simulate a previous send
    const { data: existingEmail } = await http.post<any>({
      path: "/e2e/notification-emails",
      query: ws(),
      body: {
        campaignId,
        partnerId: partner.id,
        recipientUserId: E2E_USER_ID,
      },
    });

    expect(existingEmail).not.toBeNull();

    // Trigger the workflow — should skip this partner (already sent)
    const { status, data: triggerData } = await http.post<{ message: string }>({
      path: `/e2e/trigger-workflow/${workflow.id}`,
      query: ws(),
    });

    expect(status).toEqual(200);
    expect(triggerData.message).toContain("Finished executing workflow");

    // Verify still only 1 notification email (no duplicate)
    const { data: emails } = await http.get<any[]>({
      path: "/e2e/notification-emails",
      query: ws({ campaignId, partnerId: partner.id }),
    });

    expect(emails).toHaveLength(1);
    expect(emails[0].id).toBe(existingEmail.id);
  });

  test("Campaign workflow configuration can be updated", async () => {
    const { status: createStatus, data: campaign } = await http.post<{
      id: string;
    }>({
      path: "/campaigns",
      query: ws(),
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
      query: ws(),
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

    const { data: workflow } = await http.get<any>({
      path: "/e2e/workflows",
      query: ws({ campaignId }),
    });

    expect(workflow).not.toBeNull();
    const conditions1 = workflow.triggerConditions as any[];
    expect(conditions1[0].value).toBe(1);

    const { status: pauseStatus, data: pausedCampaign } =
      await http.patch<Campaign>({
        path: `/campaigns/${campaignId}`,
        query: ws(),
        body: {
          status: "paused",
        },
      });

    expect(pauseStatus).toEqual(200);
    expect(pausedCampaign.status).toBe("paused");

    const { data: pausedWorkflow } = await http.get<any>({
      path: "/e2e/workflows",
      query: ws({ campaignId }),
    });

    expect(pausedWorkflow.disabledAt).not.toBeNull();
  });
});
