import {
  groupMoveRulesSchema,
  type GroupMoveRules,
} from "@/lib/zod/schemas/group-move-workflows";
import {
  WORKFLOW_ACTION_TYPES,
  workflowActionSchema,
} from "@/lib/zod/schemas/workflows";
import { Workflow } from "@prisma/client";
import * as z from "zod/v4";

export function parseMoveGroupWorkflowConfig(
  workflow: Pick<Workflow, "id" | "triggerConditions" | "actions">,
) {
  const conditions = groupMoveRulesSchema.parse(workflow.triggerConditions);

  const actions = z.array(workflowActionSchema).parse(workflow.actions);

  if (conditions.length === 0) {
    throw new Error("No conditions found in workflow.");
  }

  if (actions.length === 0) {
    throw new Error("No actions found in workflow.");
  }

  const action = actions[0];

  if (action.type !== WORKFLOW_ACTION_TYPES.MoveGroup) {
    throw new Error(
      `Expected moveGroup action, got ${action.type} for workflow ${workflow.id}.`,
    );
  }

  return {
    conditions: conditions as GroupMoveRules,
    condition: conditions[0],
    action,
  };
}
