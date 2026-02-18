import { EnrolledPartnerProps } from "@/lib/types";
import { RESOURCE_COLORS } from "@/ui/colors";
import { PartnerGroup } from "@dub/prisma/client";
import { randomValue } from "@dub/utils";
import { describe, expect, onTestFinished, test } from "vitest";
import { randomEmail } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_PROGRAM } from "../utils/resource";
import { trackLeads } from "./utils/track-leads";
import { verifyPartnerGroupMove } from "./utils/verify-partner-group-move";

async function cleanupOrphanedGroup(
  http: any,
  slug: string,
  allGroups: PartnerGroup[],
) {
  const orphan = allGroups.find((g) => g.slug === slug);
  if (orphan) await http.delete({ path: `/groups/${orphan.id}` });
}

describe.sequential("Workflow - MoveGroup", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();
  const programId = E2E_PROGRAM.id;

  const { data: allGroupsForCleanup } = await http.get<PartnerGroup[]>({
    path: "/groups",
  });

  test("Workflow is created when move rules are configured", async () => {
    const slug = "e2e-target-config";
    await cleanupOrphanedGroup(http, slug, allGroupsForCleanup);

    const { status: targetStatus, data: targetGroup } =
      await http.post<PartnerGroup>({
        path: "/groups",
        body: {
          name: "E2E Target Group - Config Test",
          slug,
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

    const { data: workflow } = await http.get<any>({
      path: "/e2e/workflows",
      query: { groupId: targetGroup.id },
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
    expect(workflowConditions[0].operator).toBe("gte");
    expect(workflowConditions[0].value).toBe(10);
  });

  test("Workflow is deleted when move rules are removed", async () => {
    const slug = "e2e-remove-rules";
    await cleanupOrphanedGroup(http, slug, allGroupsForCleanup);

    const { status: groupStatus, data: group } = await http.post<PartnerGroup>({
      path: "/groups",
      body: {
        name: "E2E Group - Remove Rules",
        slug,
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

    const { data: workflow } = await http.get<any>({
      path: "/e2e/workflows",
      query: { groupId: group.id },
    });

    expect(workflow).not.toBeNull();

    const { status: removeStatus } = await http.patch({
      path: `/groups/${group.id}`,
      body: {
        moveRules: [],
      },
    });

    expect(removeStatus).toEqual(200);

    const { data: deletedWorkflow } = await http.get<any>({
      path: "/e2e/workflows",
      query: { groupId: group.id },
    });

    expect(deletedWorkflow).toBeNull();
  });

  test("Disabled workflow doesn't execute partner move", async () => {
    const slug = "e2e-target-disabled";
    await cleanupOrphanedGroup(http, slug, allGroupsForCleanup);

    const { data: existingGroups } = await http.get<PartnerGroup[]>({
      path: "/groups",
    });

    expect(existingGroups.length).toBeGreaterThan(0);
    const sourceGroup = existingGroups[0];

    const { status: targetStatus, data: targetGroup } =
      await http.post<PartnerGroup>({
        path: "/groups",
        body: {
          name: "E2E Target Group - Disabled Move",
          slug,
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

    const { data: workflow } = await http.get<any>({
      path: "/e2e/workflows",
      query: { groupId: targetGroup.id },
    });

    expect(workflow).not.toBeNull();
    expect(workflow.disabledAt).toBeNull();

    await http.patch({
      path: `/e2e/workflows/${workflow.id}`,
      body: { disabledAt: new Date().toISOString() },
    });

    const { status: partnerStatus, data: partner } =
      await http.post<EnrolledPartnerProps>({
        path: "/partners",
        body: {
          name: "E2E Test Partner - Disabled Move",
          email: randomEmail(),
          groupId: sourceGroup.id,
        },
      });

    expect(partnerStatus).toEqual(201);
    expect(partner.links).not.toBeNull();

    const partnerLink = partner.links![0];

    await trackLeads(http, partnerLink, 3);

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const { data: partnerAfter } = await http.get<EnrolledPartnerProps>({
      path: `/partners/${partner.id}`,
    });

    expect(partnerAfter.groupId).toBe(sourceGroup.id);
  });

  test("Workflow doesn't execute when conditions are not met", async () => {
    const slug = "e2e-target-not-met";
    await cleanupOrphanedGroup(http, slug, allGroupsForCleanup);

    const { data: existingGroups } = await http.get<PartnerGroup[]>({
      path: "/groups",
    });

    expect(existingGroups.length).toBeGreaterThan(0);
    const sourceGroup = existingGroups[0];

    const { status: targetStatus, data: targetGroup } =
      await http.post<PartnerGroup>({
        path: "/groups",
        body: {
          name: "E2E Target Group - Not Met",
          slug,
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

    const { status: partnerStatus, data: partner } =
      await http.post<EnrolledPartnerProps>({
        path: "/partners",
        body: {
          name: "E2E Test Partner - Not Met",
          email: randomEmail(),
          groupId: sourceGroup.id,
        },
      });

    expect(partnerStatus).toEqual(201);
    expect(partner.links).not.toBeNull();

    const partnerLink = partner.links![0];

    await trackLeads(http, partnerLink, 1);

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const { data: partnerAfter } = await http.get<EnrolledPartnerProps>({
      path: `/partners/${partner.id}`,
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
      });

      expect(existingGroups.length).toBeGreaterThan(0);
      const sourceGroup = existingGroups[0];

      const { status: targetStatus, data: targetGroup } =
        await http.post<PartnerGroup>({
          path: "/groups",
          body: {
            name: "E2E Target Group - Move Execution",
            slug,
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

      const { status: partnerStatus, data: partner } =
        await http.post<EnrolledPartnerProps>({
          path: "/partners",
          body: {
            name: "E2E Test Partner - Move Execution",
            email: randomEmail(),
            groupId: sourceGroup.id,
          },
        });

      expect(partnerStatus).toEqual(201);
      expect(partner.links).not.toBeNull();
      expect(partner.groupId).toBe(sourceGroup.id);

      const partnerLink = partner.links![0];

      await trackLeads(http, partnerLink, 3);

      await verifyPartnerGroupMove({
        http,
        partnerId: partner.id,
        expectedGroupId: targetGroup.id,
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
      });

      expect(existingGroups.length).toBeGreaterThan(0);
      const sourceGroup = existingGroups[0];

      const { status: targetStatus, data: targetGroup } =
        await http.post<PartnerGroup>({
          path: "/groups",
          body: {
            name: "E2E Target Group - No Dup Move",
            slug,
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

      const { status: partnerStatus, data: partner } =
        await http.post<EnrolledPartnerProps>({
          path: "/partners",
          body: {
            name: "E2E Test Partner - No Dup Move",
            email: randomEmail(),
            groupId: sourceGroup.id,
          },
        });

      expect(partnerStatus).toEqual(201);
      expect(partner.links).not.toBeNull();

      const partnerLink = partner.links![0];

      await trackLeads(http, partnerLink, 5);

      await verifyPartnerGroupMove({
        http,
        partnerId: partner.id,
        expectedGroupId: targetGroup.id,
      });

      const { data: partnerAfter } = await http.get<EnrolledPartnerProps>({
        path: `/partners/${partner.id}`,
      });

      expect(partnerAfter.groupId).toBe(targetGroup.id);
    },
  );

  test("Multiple move rules can be configured (AND operator)", async () => {
    const slug = "e2e-multi-rules";
    await cleanupOrphanedGroup(http, slug, allGroupsForCleanup);

    const { status: groupStatus, data: group } = await http.post<PartnerGroup>({
      path: "/groups",
      body: {
        name: "E2E Group - Multiple Rules",
        slug,
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

    const { data: workflow } = await http.get<any>({
      path: "/e2e/workflows",
      query: { groupId: group.id },
    });

    expect(workflow).not.toBeNull();

    const workflowConditions = workflow.triggerConditions as any[];
    expect(workflowConditions).toHaveLength(2);
    expect(workflowConditions[0].attribute).toBe("totalLeads");
    expect(workflowConditions[0].value).toBe(10);
    expect(workflowConditions[1].attribute).toBe("totalConversions");
    expect(workflowConditions[1].value).toBe(5);
  });
});
