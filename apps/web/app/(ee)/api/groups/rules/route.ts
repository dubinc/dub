import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
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

    const { fromGroupId, toGroupId, triggerCondition } =
      createGroupRuleSchema.parse(await parseRequestBody(req));

    if (fromGroupId === toGroupId) {
      throw new DubApiError({
        code: "bad_request",
        message: "From group and to group cannot be the same.",
      });
    }

    const groups = await prisma.partnerGroup.findMany({
      where: {
        programId,
        id: {
          in: [fromGroupId, toGroupId],
        },
      },
      select: {
        id: true,
      },
    });

    const groupIds = new Set(groups.map((g) => g.id));

    if (!groupIds.has(fromGroupId)) {
      throw new DubApiError({
        code: "bad_request",
        message: "From group does not exist.",
      });
    }

    if (!groupIds.has(toGroupId)) {
      throw new DubApiError({
        code: "bad_request",
        message: "To group does not exist.",
      });
    }

    const partnerGroupRule = await prisma.$transaction(async (tx) => {
      const action: WorkflowAction = {
        type: WORKFLOW_ACTION_TYPES.MoveGroup,
        data: {
          fromGroupId,
          toGroupId,
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
          groupId: fromGroupId,
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
