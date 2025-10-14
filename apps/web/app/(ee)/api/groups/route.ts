import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createId } from "@/lib/api/create-id";
import { DubApiError, exceededLimitError } from "@/lib/api/errors";
import { getGroups } from "@/lib/api/groups/get-groups";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  createGroupSchema,
  DEFAULT_PARTNER_GROUP,
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

    console.time("getGroups");
    const groups = await getGroups({
      ...parsedInput,
      programId,
    });
    console.timeEnd("getGroups");

    return NextResponse.json(z.array(GroupSchemaExtended).parse(groups));
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

// POST /api/groups - create a group for a program
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { name, slug, color } = createGroupSchema.parse(
      await parseRequestBody(req),
    );

    const program = await prisma.program.findUniqueOrThrow({
      where: {
        id: programId,
      },
      include: {
        groups: {
          where: {
            slug: DEFAULT_PARTNER_GROUP.slug,
          },
          include: {
            partnerGroupDefaultLinks: true,
          },
        },
      },
    });

    const group = await prisma.$transaction(async (tx) => {
      const [existingGroup, groupsCount] = await Promise.all([
        tx.partnerGroup.findUnique({
          where: {
            programId_slug: {
              programId,
              slug,
            },
          },
        }),
        tx.partnerGroup.count({
          where: {
            programId,
          },
        }),
      ]);

      if (existingGroup) {
        throw new DubApiError({
          code: "conflict",
          message: `Group with slug ${slug} already exists in your program.`,
        });
      }

      if (groupsCount >= workspace.groupsLimit) {
        throw new DubApiError({
          code: "exceeded_limit",
          message: exceededLimitError({
            plan: workspace.plan,
            limit: workspace.groupsLimit,
            type: "groups",
          }),
        });
      }

      // copy over the default group's link settings + lander/application data
      // when creating a new group
      const {
        additionalLinks,
        maxPartnerLinks,
        linkStructure,
        partnerGroupDefaultLinks,
        applicationFormData,
        landerData,
      } = program.groups[0];

      return await tx.partnerGroup.create({
        data: {
          id: createId({ prefix: "grp_" }),
          programId,
          name,
          slug,
          color,
          ...(additionalLinks && { additionalLinks }),
          ...(maxPartnerLinks && { maxPartnerLinks }),
          ...(linkStructure && { linkStructure }),
          ...(applicationFormData && { applicationFormData }),
          ...(landerData && { landerData }),
          partnerGroupDefaultLinks: {
            createMany: {
              data: partnerGroupDefaultLinks.map((link) => ({
                id: createId({ prefix: "pgdl_" }),
                programId,
                domain: link.domain,
                url: link.url,
              })),
            },
          },
        },
        include: {
          clickReward: true,
          leadReward: true,
          saleReward: true,
          discount: true,
        },
      });
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
