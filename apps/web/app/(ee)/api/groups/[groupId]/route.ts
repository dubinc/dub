import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getGroupOrThrow } from "@/lib/api/programs/get-group-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { GroupSchema, updateGroupSchema } from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/groups/[groupId] - get information about a group
export const GET = withWorkspace(
  async ({ params, workspace }) => {
    const { groupId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const group = await getGroupOrThrow({
      programId,
      groupId,
      includeRewardsAndDiscount: true,
    });

    return NextResponse.json(GroupSchema.parse(group));
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

// PATCH /api/groups/[groupId] – update a group for a workspace
export const PATCH = withWorkspace(
  async ({ req, params, workspace, session }) => {
    const { groupId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const group = await getGroupOrThrow({
      programId,
      groupId,
    });

    const { name, slug, color } = updateGroupSchema.parse(
      await parseRequestBody(req),
    );

    // Only check slug uniqueness if slug is being updated
    if (slug && slug.toLowerCase() !== group.slug.toLowerCase()) {
      if (group.slug === "default") {
        throw new DubApiError({
          code: "bad_request",
          message: "You cannot change the slug of the default group.",
        });
      }

      const existingGroup = await prisma.partnerGroup.findUnique({
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
    }

    const updatedGroup = await prisma.partnerGroup.update({
      where: {
        id: groupId,
      },
      data: {
        name,
        slug,
        color,
      },
    });

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId,
        action: "group.updated",
        description: `Group ${updatedGroup.name} (${group.id}) updated`,
        actor: session.user,
        targets: [
          {
            type: "group",
            id: group.id,
            metadata: updatedGroup,
          },
        ],
      }),
    );

    return NextResponse.json(GroupSchema.parse(updatedGroup));
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

// DELETE /api/groups/[groupId] – delete a group for a workspace
export const DELETE = withWorkspace(
  async ({ params, workspace, session }) => {
    const { groupId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const group = await getGroupOrThrow({
      programId,
      groupId,
    });

    if (group.slug === "default") {
      throw new DubApiError({
        code: "forbidden",
        message: "You cannot delete the default group of your program.",
      });
    }

    const defaultGroup = await prisma.partnerGroup.findUnique({
      where: {
        programId_slug: {
          programId,
          slug: "default",
        },
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.programEnrollment.updateMany({
        where: {
          partnerGroupId: group.id,
        },
        data: {
          ...(defaultGroup && {
            partnerGroupId: defaultGroup.id,
            clickRewardId: defaultGroup.clickRewardId,
            leadRewardId: defaultGroup.leadRewardId,
            saleRewardId: defaultGroup.saleRewardId,
            discountId: defaultGroup.discountId,
          }),
        },
      });

      if (group.clickRewardId || group.leadRewardId || group.saleRewardId) {
        await tx.reward.deleteMany({
          where: {
            id: {
              in: [
                group.clickRewardId,
                group.leadRewardId,
                group.saleRewardId,
              ].filter(Boolean) as string[],
            },
          },
        });
      }

      if (group.discountId) {
        await tx.discount.delete({
          where: {
            id: group.discountId,
          },
        });
      }

      await tx.partnerGroup.delete({
        where: {
          id: group.id,
        },
      });
    });

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId,
        action: "group.deleted",
        description: `Group ${group.name} (${group.id}) deleted`,
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

    return NextResponse.json({ id: group.id });
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
