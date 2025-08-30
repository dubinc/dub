import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import {
  WorkflowAction,
  WorkflowCondition,
  WorkflowContext,
} from "@/lib/types";
import {
  OPERATOR_FUNCTIONS,
  workflowActionSchema,
  workflowConditionSchema,
} from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { WorkflowTrigger } from "@dub/prisma/client";
import { z } from "zod";
import { executeAwardBountyAction } from "./execute-award-bounty-action";

export async function executeWorkflows({
  programId,
  partnerId,
  trigger,
}: {
  programId: string;
  partnerId: string;
  trigger: WorkflowTrigger;
}) {
  const workflows = await prisma.workflow.findMany({
    where: {
      programId,
      trigger,
    },
  });

  if (workflows.length === 0) {
    return;
  }

  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    select: {
      groupId: true,
      totalCommissions: true,
      links: {
        select: {
          clicks: true,
          sales: true,
          leads: true,
          conversions: true,
          saleAmount: true,
        },
      },
    },
  });

  if (!programEnrollment) {
    console.error(
      `Partner ${partnerId} is not enrolled in program ${programId}.`,
    );
    return;
  }

  if (!programEnrollment.groupId) {
    console.error(
      `Partner ${partnerId} is not enrolled in a group in program ${programId}.`,
    );
    return;
  }

  const { totalLeads, totalConversions, totalSaleAmount } =
    aggregatePartnerLinksStats(programEnrollment.links);

  const workflowContext: WorkflowContext = {
    partnerId,
    groupId: programEnrollment.groupId,
    totalLeads,
    totalConversions,
    totalSaleAmount,
    totalCommissions: programEnrollment.totalCommissions,
  };

  // Execute each workflow for the program
  for (const workflow of workflows) {
    const conditions = z
      .array(workflowConditionSchema)
      .parse(workflow.triggerConditions);

    if (conditions.length === 0) {
      continue;
    }

    const actions = z.array(workflowActionSchema).parse(workflow.actions);

    if (actions.length === 0) {
      continue;
    }

    // We only support one trigger and action for now
    const condition = conditions[0];
    const action = actions[0];

    const shouldExecute = evaluateWorkflowCondition({
      condition,
      context: workflowContext,
    });

    if (!shouldExecute) {
      console.log(
        `Workflow ${workflow.id} does not meet the trigger condition.`,
      );
      continue;
    }

    await executeWorkflowAction({
      action,
      context: workflowContext,
    });
  }
}

function evaluateWorkflowCondition({
  condition,
  context,
}: {
  condition: WorkflowCondition;
  context: WorkflowContext;
}) {
  console.log("Evaluating workflow condition", condition, context);

  const operatorFn = OPERATOR_FUNCTIONS[condition.operator];

  if (!operatorFn) {
    throw new Error(
      `Operator ${condition.operator} is not supported in the workflow trigger condition.`,
    );
  }

  return operatorFn(context[condition.attribute], condition.value);
}

async function executeWorkflowAction({
  action,
  context,
}: {
  action: WorkflowAction;
  context: WorkflowContext;
}) {
  switch (action.type) {
    case "awardBounty":
      await executeAwardBountyAction({
        action,
        context,
      });
      break;
  }
}
