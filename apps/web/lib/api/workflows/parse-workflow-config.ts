import {
  workflowActionSchema,
  workflowConditionSchema,
} from "@/lib/zod/schemas/workflows";
import { Workflow } from "@dub/prisma/client";
import { z } from "zod";

export function parseWorkflowConfig(
  workflow: Pick<Workflow, "id" | "triggerConditions" | "actions">,
) {
  const conditionsResult = z
    .array(workflowConditionSchema)
    .safeParse(workflow.triggerConditions);

  if (!conditionsResult.success) {
    return null;
  }

  const actionsResult = z
    .array(workflowActionSchema)
    .safeParse(workflow.actions);

  if (!actionsResult.success) {
    return null;
  }

  const conditions = conditionsResult.data;
  const actions = actionsResult.data;

  if (conditions.length === 0 || actions.length === 0) {
    return null;
  }

  // We only support one trigger and one action for now
  return {
    condition: conditions[0],
    action: actions[0],
  };
}
