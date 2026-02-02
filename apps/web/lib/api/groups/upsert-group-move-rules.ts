import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { WorkflowAction, WorkflowCondition, WorkspaceProps } from "@/lib/types";
import { WORKFLOW_ACTION_TYPES } from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { PartnerGroup, WorkflowTrigger } from "@dub/prisma/client";
import { pluralize } from "@dub/utils";
import { createId } from "../create-id";
import { DubApiError } from "../errors";
import { findGroupsWithMatchingRules } from "./find-groups-with-matching-rules";
import { getGroupMoveRules } from "./get-group-move-rules";

export async function upsertGroupMoveRules({
  workspace,
  group,
  moveRules,
}: {
  workspace: Pick<WorkspaceProps, "plan" | "defaultProgramId">;
  group: PartnerGroup;
  moveRules?: WorkflowCondition[];
}): Promise<{ workflowId: string | null | undefined }> {
  const { canUseGroupMoveRule } = getPlanCapabilities(workspace.plan);

  if (moveRules && !canUseGroupMoveRule) {
    throw new DubApiError({
      code: "forbidden",
      message:
        "Group move rules are only available on the Advanced plan and above.",
    });
  }

  if (moveRules?.length === 0 && group.workflowId) {
    await prisma.workflow.delete({
      where: {
        id: group.workflowId,
      },
    });

    return {
      workflowId: null,
    };
  }

  // Do nothing if no move rule is provided
  if (!moveRules) {
    return {
      workflowId: undefined,
    };
  }

  const groupsWithMatchingRules = findGroupsWithMatchingRules({
    groups: await getGroupMoveRules(group.programId),
    currentRules: moveRules,
    currentGroupId: group.id,
  });

  if (groupsWithMatchingRules.length > 0) {
    const groupNames = groupsWithMatchingRules.map((g) => g.name).join(", ");

    throw new DubApiError({
      code: "bad_request",
      message: `This rule is already in use by the ${groupNames} ${pluralize("group", groupsWithMatchingRules.length)}. Select a different activity or amount.`,
    });
  }

  const action: WorkflowAction = {
    type: WORKFLOW_ACTION_TYPES.MoveGroup,
    data: {
      groupId: group.id,
    },
  };

  const workflowData = {
    trigger: "partnerMetricsUpdated" as WorkflowTrigger,
    triggerConditions: moveRules,
    actions: [action],
  };

  // Create a new workflow
  if (!group.workflowId) {
    const workflow = await prisma.workflow.create({
      data: {
        id: createId({ prefix: "wf_" }),
        programId: group.programId,
        ...workflowData,
      },
    });

    return {
      workflowId: workflow.id,
    };
  }

  // Update the existing workflow
  const workflow = await prisma.workflow.update({
    where: {
      id: group.workflowId,
    },
    data: workflowData,
  });

  return {
    workflowId: workflow.id,
  };
}
