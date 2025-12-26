import { WorkflowConditionAttribute, WorkflowContext } from "@/lib/types";
import { WORKFLOW_ACTION_TYPES } from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { Workflow, WorkspaceRole } from "@dub/prisma/client";
import { getWorkspaceUsers } from "../get-workspace-users";
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
  const { programId, partnerId, groupId } = identity;

  if (!groupId) {
    console.error("Partner groupId not set in the context. Skipping..");
    return;
  }

  const { groupId: newGroupId } = action.data;

  // Do nothing if the partner is already in the group
  if (groupId === newGroupId) {
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

  const group = await prisma.partnerGroup.findUnique({
    where: {
      id: newGroupId,
    },
    select: {
      id: true,
      clickRewardId: true,
      leadRewardId: true,
      saleRewardId: true,
      discountId: true,
    },
  });

  if (!group) {
    console.log(`Group ${newGroupId} not found. Skipping..`);
    return;
  }

  const owners = await getWorkspaceUsers({
    programId,
    role: WorkspaceRole.owner,
  });

  if (owners.users.length === 0) {
    console.log("No owners found for the program. Skipping..");
    return;
  }

  await movePartnersToGroup({
    programId,
    partnerIds: [partnerId],
    userId: owners.users[0].id,
    group,
  });
};
