import { WorkflowConditionAttribute, WorkflowContext } from "@/lib/types";
import { WORKFLOW_ACTION_TYPES } from "@/lib/zod/schemas/workflows";
import { Workflow } from "@dub/prisma/client";
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
      `Workflow ${workflow.id} is not a move group workflow: ${action.type}`,
    );
    return;
  }

  const { identity, metrics } = context;
  const { programId, partnerId, groupId } = identity;

  if (!groupId) {
    console.error("Partner groupId not set in the context.");
    return;
  }

  const { groupId: newGroupId } = action.data;

  if (groupId === newGroupId) {
    return;
  }

  const finalContext: Partial<
    Record<WorkflowConditionAttribute, number | null>
  > = {
    totalLeads: metrics?.aggregated?.leads ?? 0,
    totalConversions: metrics?.aggregated?.conversions ?? 0,
    totalSaleAmount: metrics?.aggregated?.saleAmount ?? 0,
    totalCommissions: metrics?.aggregated?.commissions ?? 0,
  };

  // const shouldExecute = evaluateWorkflowCondition({
  //   condition,
  //   attributes: {
  //     [condition.attribute]: finalContext[condition.attribute],
  //   },
  // });

  // if (!shouldExecute) {
  //   console.log(
  //     `Partner groupId ${groupId} does not meet the trigger condition.`,
  //   );
  //   return;
  // }

  // const group = await prisma.partnerGroup.findUnique({
  //   where: {
  //     id: newGroupId,
  //   },
  //   select: {
  //     id: true,
  //     clickRewardId: true,
  //     leadRewardId: true,
  //     saleRewardId: true,
  //     discountId: true,
  //   },
  // });

  // if (!group) {
  //   console.error(`Group with ID ${newGroupId} not found.`);
  //   return;
  // }

  // await movePartnersToGroup({
  //   programId,
  //   partnerIds: [partnerId],
  //   userId: "context.userId", // TODO: Fix it
  //   group,
  // });
};
