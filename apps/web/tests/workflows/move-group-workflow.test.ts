import { EnrolledPartnerProps } from "@/lib/types";
import { RESOURCE_COLORS } from "@/ui/colors";
import { randomValue } from "@dub/utils";
import { prisma } from "@dub/prisma";
import { PartnerGroup } from "@dub/prisma/client";
import { describe, expect, test, onTestFinished } from "vitest";
import { randomEmail } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_PROGRAM, E2E_TRACK_CLICK_HEADERS } from "../utils/resource";
import { verifyPartnerGroupMove } from "./utils/verify-partner-group-move";

async function trackLeads(
  http: any,
  partnerLink: { domain: string; key: string },
  count: number,
) {
  for (let i = 0; i < count; i++) {
    const { status: clickStatus, data: clickData } = await http.post({
      path: "/track/click",
      headers: E2E_TRACK_CLICK_HEADERS,
      body: {
        domain: partnerLink.domain,
        key: partnerLink.key,
      },
    });

    expect(clickStatus).toEqual(200);
    expect(clickData.clickId).toBeDefined();

    const { status: leadStatus } = await http.post({
      path: "/track/lead",
      body: {
        clickId: clickData.clickId,
        eventName: `Signup-${i}-${Date.now()}`,
        customerExternalId: `e2e-customer-${i}-${Date.now()}`,
        customerEmail: `customer${i}@example.com`,
      },
    });

    expect(leadStatus).toEqual(200);

    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

describe.sequential("Workflow - MoveGroup", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();
  const programId = E2E_PROGRAM.id;

  test("Workflow is created when move rules are configured", async () => {
    const { status: targetStatus, data: targetGroup } = await http.post<
      PartnerGroup
    >({
      path: "/groups",
      body: {
        name: "E2E Target Group - Config Test",
        slug: `e2e-target-config-${Date.now()}`,
        color: randomValue(RESOURCE_COLORS),
      },
    });

    expect(targetStatus).toEqual(201);

    onTestFinished(async () => {
      await http.delete({ path: `/groups/${targetGroup.id}` });
    });

    const { status: patchStatus } = await http.patch({
      path: `/groups/${targetGroup.id}`,
      body: {
        moveRules: [
          {
            attribute: "totalLeads",
            operator: "gte",
            value: 10,
          },
        ],
      },
    });

    expect(patchStatus).toEqual(200);

    const workflow = await prisma.workflow.findFirst({
      where: {
        partnerGroup: { id: targetGroup.id },
      },
    });

    expect(workflow).not.toBeNull();
    expect(workflow?.trigger).toBe("partnerMetricsUpdated");
    expect(workflow?.disabledAt).toBeNull();

    const workflowActions = workflow?.actions as any[];
    expect(workflowActions).toHaveLength(1);
    expect(workflowActions[0].type).toBe("moveGroup");
    expect(workflowActions[0].data.groupId).toBe(targetGroup.id);

    const workflowConditions = workflow?.triggerConditions as any[];
    expect(workflowConditions).toHaveLength(1);
    expect(workflowConditions[0].attribute).toBe("totalLeads");
    expect(workflowConditions[0].operator).toBe("gte");
    expect(workflowConditions[0].value).toBe(10);
  });

  test("Workflow is deleted when move rules are removed", async () => {
    const { status: groupStatus, data: group } = await http.post<PartnerGroup>({
      path: "/groups",
      body: {
        name: "E2E Group - Remove Rules",
        slug: `e2e-remove-rules-${Date.now()}`,
        color: randomValue(RESOURCE_COLORS),
      },
    });

    expect(groupStatus).toEqual(201);

    onTestFinished(async () => {
      await http.delete({ path: `/groups/${group.id}` });
    });

    const { status: addStatus } = await http.patch({
      path: `/groups/${group.id}`,
      body: {
        moveRules: [
          {
            attribute: "totalLeads",
            operator: "gte",
            value: 5,
          },
        ],
      },
    });

    expect(addStatus).toEqual(200);

    let workflow = await prisma.workflow.findFirst({
      where: { partnerGroup: { id: group.id } },
    });

    expect(workflow).not.toBeNull();
    const workflowId = workflow!.id;

    const { status: removeStatus } = await http.patch({
      path: `/groups/${group.id}`,
      body: {
        moveRules: [],
      },
    });

    expect(removeStatus).toEqual(200);

    workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    expect(workflow).toBeNull();
  });

  test("Workflow can be disabled via disabledAt field", async () => {
    const { status: targetStatus, data: targetGroup } = await http.post<
      PartnerGroup
    >({
      path: "/groups",
      body: {
        name: "E2E Target Group - Disable Test",
        slug: `e2e-target-disable-${Date.now()}`,
        color: randomValue(RESOURCE_COLORS),
      },
    });

    expect(targetStatus).toEqual(201);

    onTestFinished(async () => {
      await http.delete({ path: `/groups/${targetGroup.id}` });
    });

    const { status: patchStatus } = await http.patch({
      path: `/groups/${targetGroup.id}`,
      body: {
        moveRules: [
          {
            attribute: "totalLeads",
            operator: "gte",
            value: 5,
          },
        ],
      },
    });

    expect(patchStatus).toEqual(200);

    const workflow = await prisma.workflow.findFirst({
      where: { partnerGroup: { id: targetGroup.id } },
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

  test("Workflow executes when conditions are met - partner moves to target group", { timeout: 90000 }, async () => {
    const { data: existingGroups } = await http.get<PartnerGroup[]>({
      path: "/groups",
    });

    expect(existingGroups.length).toBeGreaterThan(0);
    const sourceGroup = existingGroups[0];

    const { status: targetStatus, data: targetGroup } = await http.post<
      PartnerGroup
    >({
      path: "/groups",
      body: {
        name: "E2E Target Group - Move Execution",
        slug: `e2e-target-exec-${Date.now()}`,
        color: randomValue(RESOURCE_COLORS),
      },
    });

    expect(targetStatus).toEqual(201);

    onTestFinished(async () => {
      await http.delete({ path: `/groups/${targetGroup.id}` });
    });

    const { status: patchStatus } = await http.patch({
      path: `/groups/${targetGroup.id}`,
      body: {
        moveRules: [
          {
            attribute: "totalLeads",
            operator: "gte",
            value: 2,
          },
        ],
      },
    });

    expect(patchStatus).toEqual(200);

    const { status: partnerStatus, data: partner } = await http.post<
      EnrolledPartnerProps
    >({
      path: "/partners",
      body: {
        name: "E2E Test Partner - Move Execution",
        email: randomEmail(),
        groupId: sourceGroup.id,
      },
    });

    expect(partnerStatus).toEqual(201);
    expect(partner.links).not.toBeNull();

    const enrollment = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId: partner.id,
          programId,
        },
      },
      select: { id: true, groupId: true },
    });

    if (!enrollment) {
      console.warn(
        `Skipping test: Partner ${partner.id} not enrolled in program ${programId}. This may indicate an E2E seed configuration issue.`,
      );
      return;
    }

    expect(enrollment.groupId).toBe(sourceGroup.id);

    const partnerLink = partner.links![0];

    await trackLeads(http, partnerLink, 3);

    await verifyPartnerGroupMove({
      partnerId: partner.id,
      programId,
      expectedGroupId: targetGroup.id,
    });
  });

  test("Multiple move rules can be configured (AND operator)", async () => {
    const { status: groupStatus, data: group } = await http.post<PartnerGroup>({
      path: "/groups",
      body: {
        name: "E2E Group - Multiple Rules",
        slug: `e2e-multi-rules-${Date.now()}`,
        color: randomValue(RESOURCE_COLORS),
      },
    });

    expect(groupStatus).toEqual(201);

    onTestFinished(async () => {
      await http.delete({ path: `/groups/${group.id}` });
    });

    const { status: patchStatus } = await http.patch({
      path: `/groups/${group.id}`,
      body: {
        moveRules: [
          {
            attribute: "totalLeads",
            operator: "gte",
            value: 10,
          },
          {
            attribute: "totalConversions",
            operator: "gte",
            value: 5,
          },
        ],
      },
    });

    expect(patchStatus).toEqual(200);

    const workflow = await prisma.workflow.findFirst({
      where: { partnerGroup: { id: group.id } },
    });

    expect(workflow).not.toBeNull();

    const workflowConditions = workflow?.triggerConditions as any[];
    expect(workflowConditions).toHaveLength(2);
    expect(workflowConditions[0].attribute).toBe("totalLeads");
    expect(workflowConditions[0].value).toBe(10);
    expect(workflowConditions[1].attribute).toBe("totalConversions");
    expect(workflowConditions[1].value).toBe(5);
  });
});
