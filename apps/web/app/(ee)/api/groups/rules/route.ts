import { createId } from "@/lib/api/create-id";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { WorkflowAction } from "@/lib/types";
import {
  createGroupRuleSchema,
  getGroupRulesQuerySchema,
  GroupRuleSchema,
} from "@/lib/zod/schemas/groups";
import {
  WORKFLOW_ACTION_TYPES,
  WORKFLOW_ATTRIBUTE_TRIGGER,
} from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/groups/rules - get all group rules for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { groupId } = getGroupRulesQuerySchema.parse(searchParams);

    const groupRules = await prisma.partnerGroupRule.findMany({
      where: {
        programId,
        groupId,
      },
      include: {
        workflow: true,
      },
    });

    return NextResponse.json(z.array(GroupRuleSchema).parse(groupRules));
  },
  {
    requiredPermissions: ["groups.read"],
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);

// POST /api/groups/rules - create a group rule for a group
export const POST = withWorkspace(
  async ({ workspace, req }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { groupId, triggerCondition } = createGroupRuleSchema.parse(
      await parseRequestBody(req),
    );

    await getGroupOrThrow({
      groupId,
      programId,
    });

    const partnerGroupRule = await prisma.$transaction(async (tx) => {
      const action: WorkflowAction = {
        type: WORKFLOW_ACTION_TYPES.MoveGroup,
        data: {
          groupId,
        },
      };

      const workflow = await tx.workflow.create({
        data: {
          id: createId({ prefix: "wf_" }),
          programId,
          trigger: WORKFLOW_ATTRIBUTE_TRIGGER[triggerCondition.attribute],
          triggerConditions: [triggerCondition],
          actions: [action],
        },
      });

      return await tx.partnerGroupRule.create({
        data: {
          id: createId({ prefix: "grl_" }),
          programId,
          groupId,
          workflowId: workflow.id,
        },
      });
    });

    return NextResponse.json(GroupRuleSchema.parse(partnerGroupRule), {
      status: 201,
    });
  },
  {
    requiredPermissions: ["groups.write"],
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);
