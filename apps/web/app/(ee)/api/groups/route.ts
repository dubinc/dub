import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { getGroups } from "@/lib/api/groups/get-groups";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  createGroupSchema,
  getGroupsQuerySchema,
  GroupSchema,
  GroupSchemaExtended,
} from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/groups - get all groups for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const parsedInput = getGroupsQuerySchema.parse(searchParams);

    const groups = await getGroups({
      ...parsedInput,
      programId,
    });

    return NextResponse.json(z.array(GroupSchemaExtended).parse(groups));
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

    const { name, slug, color } = createGroupSchema.parse(
      await parseRequestBody(req),
    );

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

    const group = await prisma.partnerGroup.create({
      data: {
        id: createId({ prefix: "grp_" }),
        programId,
        name,
        slug,
        color,
      },
      include: {
        clickReward: true,
        leadReward: true,
        saleReward: true,
        discount: true,
      },
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
