import { EnrolledPartnerProps } from "@/lib/types";
import { RESOURCE_COLORS } from "@/ui/colors";
import { PartnerGroup } from "@dub/prisma/client";
import { randomValue } from "@dub/utils";
import { describe, expect, onTestFinished, test } from "vitest";
import { randomEmail } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_WORKSPACE_ID } from "../utils/resource";
import { trackE2ELead } from "./utils/track-e2e-lead";
import { verifyPartnerGroupMove } from "./utils/verify-partner-group-move";

const ws = (q: Record<string, string> = {}) => ({
  ...q,
  workspaceId: E2E_WORKSPACE_ID,
});

async function cleanupOrphanedGroup(
  http: any,
  slug: string,
  allGroups: PartnerGroup[],
) {
  const orphan = allGroups.find((g) => g.slug === slug);
  if (orphan) await http.delete({ path: `/groups/${orphan.id}`, query: ws() });
}

describe.sequential("Workflow - MoveGroup", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  const { data: allGroupsForCleanup } = await http.get<PartnerGroup[]>({
    path: "/groups",
    query: ws(),
  });

  test("Workflow is created when move rules are configured", async () => {
    const slug = "e2e-target-config";
    await cleanupOrphanedGroup(http, slug, allGroupsForCleanup);

    const { status: targetStatus, data: targetGroup } =
      await http.post<PartnerGroup>({
        path: "/groups",
        query: ws(),
        body: {
          name: "E2E Target Group - Config Test",
          slug,
          color: randomValue(RESOURCE_COLORS),
        },
      });

    expect(targetStatus).toEqual(201);

    onTestFinished(async () => {
      await http.delete({ path: `/groups/${targetGroup.id}`, query: ws() });
    });

    const { status: patchStatus } = await http.patch({
      path: `/groups/${targetGroup.id}`,
      query: ws(),
      body: {
        moveRules: [
          {
            attribute: "totalLeads",
            operator: "between",
            value: { min: 3, max: 5 },
          },
        ],
      },
    });

    expect(patchStatus).toEqual(200);

    const { data: workflow } = await http.get<any>({
      path: "/e2e/workflows",
      query: ws({ groupId: targetGroup.id }),
    });

    expect(workflow).not.toBeNull();
    expect(workflow.trigger).toBe("partnerMetricsUpdated");
    expect(workflow.disabledAt).toBeNull();

    const workflowActions = workflow.actions as any[];
    expect(workflowActions).toHaveLength(1);
    expect(workflowActions[0].type).toBe("moveGroup");
    expect(workflowActions[0].data.groupId).toBe(targetGroup.id);

    const workflowConditions = workflow.triggerConditions as any[];
    expect(workflowConditions).toHaveLength(1);
    expect(workflowConditions[0].attribute).toBe("totalLeads");
    expect(workflowConditions[0].operator).toBe("between");
    expect(workflowConditions[0].value).toStrictEqual({ min: 3, max: 5 });
  });

  test("Workflow is deleted when move rules are removed", async () => {
    const slug = "e2e-remove-rules";
    await cleanupOrphanedGroup(http, slug, allGroupsForCleanup);

    const { status: groupStatus, data: group } = await http.post<PartnerGroup>({
      path: "/groups",
      query: ws(),
      body: {
        name: "E2E Group - Remove Rules",
        slug,
        color: randomValue(RESOURCE_COLORS),
      },
    });

    expect(groupStatus).toEqual(201);

    onTestFinished(async () => {
      await http.delete({ path: `/groups/${group.id}`, query: ws() });
    });

    const { status: addStatus } = await http.patch({
      path: `/groups/${group.id}`,
      query: ws(),
      body: {
        moveRules: [
          {
            attribute: "totalLeads",
            operator: "between",
            value: { min: 2, max: 3 },
          },
        ],
      },
    });

    expect(addStatus).toEqual(200);

    const { data: workflow } = await http.get<any>({
      path: "/e2e/workflows",
      query: ws({ groupId: group.id }),
    });

    expect(workflow).not.toBeNull();

    const { status: removeStatus } = await http.patch({
      path: `/groups/${group.id}`,
      query: ws(),
      body: {
        moveRules: [],
      },
    });

    expect(removeStatus).toEqual(200);

    const { data: deletedWorkflow } = await http.get<any>({
      path: "/e2e/workflows",
      query: ws({ groupId: group.id }),
    });

    expect(deletedWorkflow).toBeNull();
  });

  test("Disabled workflow doesn't execute partner move", async () => {
    const slug = "e2e-target-disabled";
    await cleanupOrphanedGroup(http, slug, allGroupsForCleanup);

    const { data: existingGroups } = await http.get<PartnerGroup[]>({
      path: "/groups",
      query: ws(),
    });

    expect(existingGroups.length).toBeGreaterThan(0);
    const sourceGroup = existingGroups[0];

    const { status: targetStatus, data: targetGroup } =
      await http.post<PartnerGroup>({
        path: "/groups",
        query: ws(),
        body: {
          name: "E2E Target Group - Disabled Move",
          slug,
          color: randomValue(RESOURCE_COLORS),
        },
      });

    expect(targetStatus).toEqual(201);

    onTestFinished(async () => {
      await http.delete({ path: `/groups/${targetGroup.id}`, query: ws() });
    });

    const { status: patchStatus } = await http.patch({
      path: `/groups/${targetGroup.id}`,
      query: ws(),
      body: {
        moveRules: [
          {
            attribute: "totalLeads",
            operator: "between",
            value: { min: 2, max: 3 },
          },
        ],
      },
    });

    expect(patchStatus).toEqual(200);

    const { data: workflow } = await http.get<any>({
      path: "/e2e/workflows",
      query: ws({ groupId: targetGroup.id }),
    });

    expect(workflow).not.toBeNull();
    expect(workflow.disabledAt == null).toBe(true);

    await http.patch({
      path: `/e2e/workflows/${workflow.id}`,
      query: ws(),
      body: { disabledAt: new Date().toISOString() },
    });

    const { status: partnerStatus, data: partner } =
      await http.post<EnrolledPartnerProps>({
        path: "/e2e/partners",
        query: ws(),
        body: {
          name: "E2E Test Partner - Disabled Move",
          email: randomEmail(),
          groupId: sourceGroup.id,
        },
      });

    expect(partnerStatus).toEqual(201);
    expect(partner.links).toBeDefined();
    expect(partner.links!.length).toBeGreaterThan(0);

    const partnerLink = partner.links![0];

    await trackE2ELead(http, partnerLink);

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const { data: partnerAfter } = await http.get<EnrolledPartnerProps>({
      path: `/partners/${partner.id}`,
      query: ws(),
    });

    expect(partnerAfter.groupId).toBe(sourceGroup.id);
  });

  test("Workflow doesn't execute when conditions are not met", async () => {
    const slug = "e2e-target-not-met";
    await cleanupOrphanedGroup(http, slug, allGroupsForCleanup);

    const { data: existingGroups } = await http.get<PartnerGroup[]>({
      path: "/groups",
      query: ws(),
    });

    expect(existingGroups.length).toBeGreaterThan(0);
    const sourceGroup = existingGroups[0];

    const { status: targetStatus, data: targetGroup } =
      await http.post<PartnerGroup>({
        path: "/groups",
        query: ws(),
        body: {
          name: "E2E Target Group - Not Met",
          slug,
          color: randomValue(RESOURCE_COLORS),
        },
      });

    expect(targetStatus).toEqual(201);

    onTestFinished(async () => {
      await http.delete({ path: `/groups/${targetGroup.id}`, query: ws() });
    });

    const { status: patchStatus } = await http.patch({
      path: `/groups/${targetGroup.id}`,
      query: ws(),
      body: {
        moveRules: [
          {
            attribute: "totalLeads",
            operator: "between",
            value: { min: 4, max: 5 },
          },
        ],
      },
    });

    expect(patchStatus).toEqual(200);

    const { status: partnerStatus, data: partner } =
      await http.post<EnrolledPartnerProps>({
        path: "/e2e/partners",
        query: ws(),
        body: {
          name: "E2E Test Partner - Not Met",
          email: randomEmail(),
          groupId: sourceGroup.id,
        },
      });

    expect(partnerStatus).toEqual(201);
    expect(partner.links).toBeDefined();
    expect(partner.links!.length).toBeGreaterThan(0);

    const partnerLink = partner.links![0];

    await trackE2ELead(http, partnerLink);

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const { data: partnerAfter } = await http.get<EnrolledPartnerProps>({
      path: `/partners/${partner.id}`,
      query: ws(),
    });

    expect(partnerAfter.groupId).toBe(sourceGroup.id);
  });

  test(
    "Workflow executes when conditions are met - partner moves to target group",
    { timeout: 90000 },
    async () => {
      const slug = "e2e-target-exec";
      await cleanupOrphanedGroup(http, slug, allGroupsForCleanup);

      const { data: existingGroups } = await http.get<PartnerGroup[]>({
        path: "/groups",
        query: ws(),
      });

      expect(existingGroups.length).toBeGreaterThan(0);
      const sourceGroup = existingGroups[0];

      const { status: targetStatus, data: targetGroup } =
        await http.post<PartnerGroup>({
          path: "/groups",
          query: ws(),
          body: {
            name: "E2E Target Group - Move Execution",
            slug,
            color: randomValue(RESOURCE_COLORS),
          },
        });

      expect(targetStatus).toEqual(201);

      onTestFinished(async () => {
        await http.delete({ path: `/groups/${targetGroup.id}`, query: ws() });
      });

      const { status: patchStatus } = await http.patch({
        path: `/groups/${targetGroup.id}`,
        query: ws(),
        body: {
          moveRules: [
            {
              attribute: "totalLeads",
              operator: "between",
              value: { min: 1, max: 2 },
            },
          ],
        },
      });

      expect(patchStatus).toEqual(200);

      const { status: partnerStatus, data: partner } =
        await http.post<EnrolledPartnerProps>({
          path: "/e2e/partners",
          query: ws(),
          body: {
            name: "E2E Test Partner - Move Execution",
            email: randomEmail(),
            groupId: sourceGroup.id,
          },
        });

      expect(partnerStatus).toEqual(201);
      expect(partner.links).toBeDefined();
      expect(partner.links!.length).toBeGreaterThan(0);
      expect(partner.groupId).toBe(sourceGroup.id);

      const partnerLink = partner.links![0];

      await trackE2ELead(http, partnerLink);

      await verifyPartnerGroupMove({
        http,
        partnerId: partner.id,
        expectedGroupId: targetGroup.id,
        query: ws(),
      });
    },
  );

  test(
    "No duplicate group moves on multiple triggers",
    { timeout: 90000 },
    async () => {
      const slug = "e2e-target-no-dup";
      await cleanupOrphanedGroup(http, slug, allGroupsForCleanup);

      const { data: existingGroups } = await http.get<PartnerGroup[]>({
        path: "/groups",
        query: ws(),
      });

      expect(existingGroups.length).toBeGreaterThan(0);
      const sourceGroup = existingGroups[0];

      const { status: targetStatus, data: targetGroup } =
        await http.post<PartnerGroup>({
          path: "/groups",
          query: ws(),
          body: {
            name: "E2E Target Group - No Dup Move",
            slug,
            color: randomValue(RESOURCE_COLORS),
          },
        });

      expect(targetStatus).toEqual(201);

      onTestFinished(async () => {
        await http.delete({ path: `/groups/${targetGroup.id}`, query: ws() });
      });

      const { status: patchStatus } = await http.patch({
        path: `/groups/${targetGroup.id}`,
        query: ws(),
        body: {
          moveRules: [
            {
              attribute: "totalLeads",
              operator: "between",
              value: { min: 1, max: 2 },
            },
          ],
        },
      });

      expect(patchStatus).toEqual(200);

      const { status: partnerStatus, data: partner } =
        await http.post<EnrolledPartnerProps>({
          path: "/e2e/partners",
          query: ws(),
          body: {
            name: "E2E Test Partner - No Dup Move",
            email: randomEmail(),
            groupId: sourceGroup.id,
          },
        });

      expect(partnerStatus).toEqual(201);
      expect(partner.links).toBeDefined();
      expect(partner.links!.length).toBeGreaterThan(0);

      const partnerLink = partner.links![0];

      await trackE2ELead(http, partnerLink);

      await verifyPartnerGroupMove({
        http,
        partnerId: partner.id,
        expectedGroupId: targetGroup.id,
        query: ws(),
      });

      const { data: partnerAfter } = await http.get<EnrolledPartnerProps>({
        path: `/partners/${partner.id}`,
        query: ws(),
      });

      expect(partnerAfter.groupId).toBe(targetGroup.id);
    },
  );

  test("Multiple move rules can be configured (AND operator)", async () => {
    const slug = "e2e-multi-rules";
    await cleanupOrphanedGroup(http, slug, allGroupsForCleanup);

    const { status: groupStatus, data: group } = await http.post<PartnerGroup>({
      path: "/groups",
      query: ws(),
      body: {
        name: "E2E Group - Multiple Rules",
        slug,
        color: randomValue(RESOURCE_COLORS),
      },
    });

    expect(groupStatus).toEqual(201);

    onTestFinished(async () => {
      await http.delete({ path: `/groups/${group.id}`, query: ws() });
    });

    const { status: patchStatus } = await http.patch({
      path: `/groups/${group.id}`,
      query: ws(),
      body: {
        moveRules: [
          {
            attribute: "totalLeads",
            operator: "between",
            value: { min: 2, max: 3 },
          },
          {
            attribute: "totalConversions",
            operator: "between",
            value: { min: 1, max: 2 },
          },
        ],
      },
    });

    expect(patchStatus).toEqual(200);

    const { data: workflow } = await http.get<any>({
      path: "/e2e/workflows",
      query: ws({ groupId: group.id }),
    });

    expect(workflow).not.toBeNull();

    const workflowConditions = workflow.triggerConditions as any[];
    expect(workflowConditions).toHaveLength(2);
    expect(workflowConditions[0].attribute).toBe("totalLeads");
    expect(workflowConditions[0].value).toStrictEqual({ min: 2, max: 3 });
    expect(workflowConditions[1].attribute).toBe("totalConversions");
    expect(workflowConditions[1].value).toStrictEqual({ min: 1, max: 2 });
  });
});
