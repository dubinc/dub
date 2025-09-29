import {
  WorkflowCondition,
  WorkflowConditionAttribute,
  WorkflowContext,
} from "@/lib/types";
import {
  OPERATOR_FUNCTIONS,
  WORKFLOW_ACTION_TYPES,
} from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { WorkflowTrigger } from "@dub/prisma/client";
import { executeAwardBountyWorkflow } from "./execute-award-bounty-workflow";
import { executeSendCampaignWorkflow } from "./execute-send-campaign-workflow";
import { parseWorkflowConfig } from "./parse-workflow-config";

export async function executeWorkflows({
  trigger,
  context,
}: {
  trigger: WorkflowTrigger;
  context: WorkflowContext;
}) {
  const { programId, partnerId } = context;

  // Find the workflows for the program
  const workflows = await prisma.workflow.findMany({
    where: {
      programId,
      trigger,
    },
  });

  if (workflows.length === 0) {
    return;
  }

  // Find the program enrollment for the partner
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
    ...context,
    groupId: programEnrollment.groupId,
  };

  // Execute each workflow for the program
  for (const workflow of workflows) {
    const workflowConfig = parseWorkflowConfig(workflow);

    if (!workflowConfig) {
      continue;
    }

    const { action } = workflowConfig;

    if (action.type === WORKFLOW_ACTION_TYPES.AwardBounty) {
      await executeAwardBountyWorkflow({
        workflow,
        context: workflowContext,
      });
    } else if (action.type === WORKFLOW_ACTION_TYPES.SendCampaign) {
      await executeSendCampaignWorkflow({
        workflow,
        context: workflowContext,
      });
    }
  }
}

export function evaluateWorkflowCondition({
  condition,
  attributes,
}: {
  condition: WorkflowCondition;
  attributes: Partial<Record<WorkflowConditionAttribute, number | null>>;
}) {
  console.log("Evaluating the workflow condition:", {
    condition,
    attributes,
  });

  const operatorFn = OPERATOR_FUNCTIONS[condition.operator];

  if (!operatorFn) {
    throw new Error(
      `Operator ${condition.operator} is not supported in the workflow trigger condition.`,
    );
  }

  const attributeValue = attributes[condition.attribute];

  // If the attribute is not provided in context, return false
  if (!attributeValue) {
    return false;
  }

  return operatorFn(attributeValue, condition.value);
}
