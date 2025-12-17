import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import { WorkflowConditionAttribute, WorkflowContext } from "@/lib/types";
import { WORKFLOW_ACTION_TYPES } from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { Workflow } from "@dub/prisma/client";
import { movePartnersToGroup } from "../groups/move-partners-to-group";
import { evaluateWorkflowCondition } from "./execute-workflows";
import { parseWorkflowConfig } from "./parse-workflow-config";

export const executeMoveGroupWorkflow = async ({
  workflow,
  context,
}: {
  workflow: Workflow;
  context?: WorkflowContext;
}) => {
  const { condition, action } = parseWorkflowConfig(workflow);

  if (action.type !== WORKFLOW_ACTION_TYPES.MoveGroup) {
    console.error(
      `Workflow ${workflow.id} is not a move group workflow: ${action.type}`,
    );
    return;
  }

  if (!context?.groupId) {
    console.error(`Partner groupId not set in the context.`);
    return;
  }

  const { groupId: newGroupId } = action.data;

  if (context.groupId === newGroupId) {
    return;
  }

  const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
    where: {
      partnerId_programId: {
        partnerId: context.partnerId,
        programId: context.programId,
      },
    },
    select: {
      totalCommissions: true, // TODO: Fix it (This is not accurate)
      links: {
        select: {
          clicks: true,
          leads: true,
          conversions: true,
          sales: true,
          saleAmount: true,
        },
      },
    },
  });

  const { totalLeads, totalConversions, totalSaleAmount } =
    aggregatePartnerLinksStats(programEnrollment.links);

  const finalContext: Partial<
    Record<WorkflowConditionAttribute, number | null>
  > = {
    totalLeads,
    totalConversions,
    totalSaleAmount,
    totalCommissions: programEnrollment.totalCommissions,
  };

  const shouldExecute = evaluateWorkflowCondition({
    condition,
    attributes: {
      [condition.attribute]: finalContext[condition.attribute],
    },
  });

  if (!shouldExecute) {
    console.log(
      `Partner groupId ${context.groupId} does not meet the trigger condition.`,
    );
    return;
  }

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
    console.error(`Group with ID ${newGroupId} not found.`);
    return;
  }

  await movePartnersToGroup({
    programId: context.programId,
    partnerIds: [context.partnerId],
    userId: "context.userId", // TODO: Fix it
    group,
  });
};
