import {
  workflowActionSchema,
  workflowConditionSchema,
} from "@/lib/zod/schemas/workflows";
import { Workflow } from "@dub/prisma/client";
import { z } from "zod";

export function parseWorkflowConfig(
  workflow: Pick<Workflow, "id" | "triggerConditions" | "actions">,
) {
  const conditions = z
    .array(workflowConditionSchema)
    .parse(workflow.triggerConditions);

  const actions = z.array(workflowActionSchema).parse(workflow.actions);

  if (conditions.length === 0) {
    throw new Error("No conditions found in workflow.");
  }

  if (actions.length === 0) {
    throw new Error("No actions found in workflow.");
  }

  // We only support one trigger and one action for now
  return {
    condition: conditions[0],
    action: actions[0],
  };
}
