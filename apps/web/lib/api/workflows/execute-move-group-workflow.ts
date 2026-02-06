import { WorkflowConditionAttribute, WorkflowContext } from "@/lib/types";
import { redis } from "@/lib/upstash/redis";
import { WORKFLOW_ACTION_TYPES } from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { Workflow } from "@dub/prisma/client";
import { movePartnersToGroup } from "../groups/move-partners-to-group";
import { evaluateWorkflowConditions } from "./evaluate-workflow-conditions";
import { parseWorkflowConfig } from "./parse-workflow-config";

export const executeMoveGroupWorkflow = async ({
  workflow,
  context,
}: {
  workflow: Workflow;
  context: WorkflowContext;
}) => {
  const { conditions, action } = parseWorkflowConfig(workflow);

  if (action.type !== WORKFLOW_ACTION_TYPES.MoveGroup) {
    console.error(
      `Workflow ${workflow.id} is not a move group workflow: ${action.type}. Skipping..`,
    );
    return;
  }

  const { identity, metrics } = context;
  const { workspaceId, programId, partnerId, groupId } = identity;

  if (!groupId) {
    console.error("Partner groupId not set in the context. Skipping..");
    return;
  }

  const { groupId: newGroupId } = action.data;

  // Fetch program enrollment to get fresh groupId
  const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    select: {
      groupId: true,
    },
  });

  if (programEnrollment.groupId === newGroupId) {
    console.log(
      `Partner ${partnerId} is already in target group ${newGroupId}. Skipping..`,
    );
    return;
  }

  const attributes: Partial<Record<WorkflowConditionAttribute, number | null>> =
    {
      totalLeads: metrics?.aggregated?.leads ?? 0,
      totalConversions: metrics?.aggregated?.conversions ?? 0,
      totalSaleAmount: metrics?.aggregated?.saleAmount ?? 0,
      totalCommissions: metrics?.aggregated?.commissions ?? 0,
    };

  const shouldExecute = evaluateWorkflowConditions({
    conditions,
    attributes,
  });

  if (!shouldExecute) {
    console.log(
      `Partner does not meet the trigger condition for the workflow ${workflow.id}. Skipping..`,
    );
    return;
  }

  console.log(
    `Partner meets the trigger condition for the workflow ${workflow.id}. Executing..`,
  );

  const newGroup = await prisma.partnerGroup.findUnique({
    where: {
      id: newGroupId,
    },
    select: {
      id: true,
      name: true,
      clickRewardId: true,
      leadRewardId: true,
      saleRewardId: true,
      discountId: true,
    },
  });

  if (!newGroup) {
    console.log(`Group ${newGroupId} not found. Skipping..`);
    return;
  }

  // Prevents duplicate moves when a workflow with matching conditions
  // are triggered by the same partnerMetricsUpdated event.
  const lockKey = `workflow:moveGroup:${programId}:${newGroupId}:${partnerId}`;
  const acquired = await redis.set(lockKey, "1", { nx: true, ex: 10 });

  if (!acquired) {
    console.log(`Partner ${partnerId} move already in progress. Skipping..`);
    return;
  }

  try {
    await movePartnersToGroup({
      workspaceId,
      programId,
      partnerIds: [partnerId],
      userId: null,
      group: newGroup,
    });
  } finally {
    await redis.del(lockKey);
  }
};
