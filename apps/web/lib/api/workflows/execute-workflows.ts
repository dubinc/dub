import {
  WorkflowCondition,
  WorkflowConditionAttribute,
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
  context,
}: {
  programId: string;
  partnerId: string;
  trigger: WorkflowTrigger;
  context?: Pick<
    WorkflowContext,
    "totalLeads" | "totalConversions" | "totalSaleAmount" | "totalCommissions"
  >;
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
      partnerId: true,
      groupId: true,
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

  // Final context for the workflow
  const workflowContext: WorkflowContext = {
    partnerId: programEnrollment.partnerId,
    groupId: programEnrollment.groupId,
    ...context,
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

    if (action.type === "awardBounty") {
      await executeAwardBountyAction({
        condition,
        context: workflowContext,
        action,
      });
    }
  }
}

export function evaluateWorkflowCondition({
  condition,
  context,
}: {
  condition: WorkflowCondition;
  context: Partial<Record<WorkflowConditionAttribute, number | null>>;
}) {
  console.log("Evaluating the workflow condition:", {
    condition,
    context,
  });

  const operatorFn = OPERATOR_FUNCTIONS[condition.operator];

  if (!operatorFn) {
    throw new Error(
      `Operator ${condition.operator} is not supported in the workflow trigger condition.`,
    );
  }

  const attributeValue = context[condition.attribute];

  // If the attribute is not provided in context, return false
  if (!attributeValue) {
    return false;
  }

  return operatorFn(attributeValue, condition.value);
}
