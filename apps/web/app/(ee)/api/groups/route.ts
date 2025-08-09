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

    console.log(groups);

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
      icon,
      color,
      clickRewardId,
      leadRewardId,
      saleRewardId,
      discountId,
      partnerIds,
    } = createGroupSchema.parse(await parseRequestBody(req));

    // Check rewards
    if (clickRewardId || leadRewardId || saleRewardId) {
      const rewardIds = [clickRewardId, leadRewardId, saleRewardId].filter(
        (id): id is string => typeof id === "string",
      );

      const rewards = await prisma.reward.findMany({
        where: {
          programId,
          id: {
            in: rewardIds,
          },
        },
        select: {
          id: true,
          type: true,
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

        if (reward.type !== expectedTypes[rewardId]) {
          throw new DubApiError({
            code: "not_found",
            message: `Reward with ID ${rewardId} is not a ${expectedTypes[rewardId]} reward.`,
          });
        }
      }
    }

    // Check partners
    if (partnerIds && partnerIds.length > 0) {
      const uniquePartnerIds = [...new Set(partnerIds)];

      const partners = await prisma.programEnrollment.findMany({
        where: {
          programId,
          id: {
            in: uniquePartnerIds,
          },
        },
        select: {
          id: true,
        },
      });

      const partnersMap = new Map(
        partners.map((partner) => [partner.id, partner]),
      );

      for (const partnerId of uniquePartnerIds) {
        if (!partnersMap.has(partnerId)) {
          throw new DubApiError({
            code: "not_found",
            message: `Partner with ID ${partnerId} not found in your program.`,
          });
        }
      }
    }

    // TODO:
    // icon and color needs validation
    // create slug

    const group = await prisma.$transaction(async (tx) => {
      const newGroup = await tx.partnerGroup.create({
        data: {
          id: createId({ prefix: "grp_" }),
          programId,
          name,
          slug,
          icon: icon || "",
          color: color || "",
          clickRewardId,
          leadRewardId,
          saleRewardId,
          discountId,
        },
      });

      if (partnerIds && partnerIds.length > 0) {
        await tx.programEnrollment.updateMany({
          where: {
            partnerId: {
              in: partnerIds,
            },
            programId,
          },
          data: {
            partnerGroupId: newGroup.id,
            clickRewardId: newGroup.clickRewardId,
            leadRewardId: newGroup.leadRewardId,
            saleRewardId: newGroup.saleRewardId,
            discountId: newGroup.discountId,
          },
        });
      }

      return newGroup;
    });

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
