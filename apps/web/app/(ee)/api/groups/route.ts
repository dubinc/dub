import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  createGroupSchema,
  getGroupsQuerySchema,
  GroupSchema,
} from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/groups - get all groups for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { page, pageSize, search } = getGroupsQuerySchema.parse(searchParams);

    const groups = await prisma.partnerGroup.findMany({
      where: {
        programId,
        ...(search
          ? {
              OR: [
                { name: { startsWith: search } },
                { slug: { startsWith: search } },
              ],
            }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json(z.array(GroupSchema).parse(groups));
  },
  {
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

// POST /api/groups - create a group for a program
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const {
      name,
      slug,
      color,
      clickRewardId,
      leadRewardId,
      saleRewardId,
      discountId,
    } = createGroupSchema.parse(await parseRequestBody(req));

    const rewardIds = Array.from(
      new Set(
        [clickRewardId, leadRewardId, saleRewardId].filter(
          (id): id is string => typeof id === "string",
        ),
      ),
    );

    // TODO:
    // Check if the given reward or discount is already assigned to a group

    // Check rewards
    if (clickRewardId || leadRewardId || saleRewardId) {
      const rewards = await prisma.reward.findMany({
        where: {
          programId,
          id: {
            in: rewardIds,
          },
        },
        select: {
          id: true,
          event: true,
        },
      });

      const expectedTypes: Record<string, string> = {};

      if (clickRewardId) expectedTypes[clickRewardId] = "click";
      if (leadRewardId) expectedTypes[leadRewardId] = "lead";
      if (saleRewardId) expectedTypes[saleRewardId] = "sale";

      for (const rewardId of rewardIds) {
        const reward = rewards.find((reward) => reward.id === rewardId);

        if (!reward) {
          throw new DubApiError({
            code: "not_found",
            message: `Reward with ID ${rewardId} not found in your program.`,
          });
        }

        if (reward.event !== expectedTypes[rewardId]) {
          throw new DubApiError({
            code: "bad_request",
            message: `Reward with ID ${rewardId} is not a ${expectedTypes[rewardId]} reward.`,
          });
        }
      }
    }

    // Check discount
    if (discountId) {
      const discount = await prisma.discount.findUnique({
        where: {
          id: discountId,
        },
      });

      if (!discount) {
        throw new DubApiError({
          code: "not_found",
          message: `Discount with ID ${discountId} not found in your program.`,
        });
      }
    }

    const group = await prisma.$transaction(
      async (tx) => {
        const existingGroup = await tx.partnerGroup.findUnique({
          where: {
            programId_slug: {
              programId,
              slug,
            },
          },
        });

        if (existingGroup) {
          throw new DubApiError({
            code: "bad_request",
            message: `Group with slug ${slug} already exists in your program.`,
          });
        }

        const newGroup = await tx.partnerGroup.create({
          data: {
            id: createId({ prefix: "grp_" }),
            programId,
            name,
            slug,
            color,
            clickRewardId,
            leadRewardId,
            saleRewardId,
            discountId,
          },
        });

        return newGroup;
      },
      {
        isolationLevel: "RepeatableRead",
      },
    );

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId,
        action: "group.created",
        description: `Group ${group.name} (${group.id}) created`,
        actor: session.user,
        targets: [
          {
            type: "group",
            id: group.id,
            metadata: group,
          },
        ],
      }),
    );

    return NextResponse.json(GroupSchema.parse(group), {
      status: 201,
    });
  },
  {
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
