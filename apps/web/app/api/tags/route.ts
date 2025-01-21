import { DubApiError, exceededLimitError } from "@/lib/api/errors";
import { createId } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  TagSchema,
  createTagBodySchema,
  getTagsQuerySchemaExtended,
} from "@/lib/zod/schemas/tags";
import { COLORS_LIST, randomBadgeColor } from "@/ui/links/tag-badge";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/tags - get all tags for a workspace
export const GET = withWorkspace(
  async ({ workspace, headers, searchParams }) => {
    const {
      search,
      ids,
      sortBy,
      sortOrder,
      page,
      pageSize,
      includeLinksCount,
    } = getTagsQuerySchemaExtended.parse(searchParams);

    const tags = await prisma.tag.findMany({
      where: {
        projectId: workspace.id,
        ...(search && {
          name: {
            contains: search,
          },
        }),
        ...(ids && {
          id: {
            in: ids,
          },
        }),
      },
      select: {
        id: true,
        name: true,
        color: true,
        ...(includeLinksCount && {
          _count: {
            select: {
              links: true,
            },
          },
        }),
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    return NextResponse.json(tags, { headers });
  },
  {
    requiredPermissions: ["tags.read"],
  },
);

// POST /api/tags - create a tag for a workspace
export const POST = withWorkspace(
  async ({ req, workspace, headers }) => {
    const tagsCount = await prisma.tag.count({
      where: {
        projectId: workspace.id,
      },
    });

    if (tagsCount >= workspace.tagsLimit) {
      throw new DubApiError({
        code: "exceeded_limit",
        message: exceededLimitError({
          plan: workspace.plan,
          limit: workspace.tagsLimit,
          type: "tags",
        }),
      });
    }

    const { tag, color, name } = createTagBodySchema.parse(await req.json());

    const existingTag = await prisma.tag.findFirst({
      where: {
        projectId: workspace.id,
        name: name || tag,
      },
    });

    if (existingTag) {
      throw new DubApiError({
        code: "conflict",
        message: "A tag with that name already exists.",
      });
    }

    const response = await prisma.tag.create({
      data: {
        id: createId({ prefix: "tag_" }),
        name: tag || name!,
        color:
          color && COLORS_LIST.map(({ color }) => color).includes(color)
            ? color
            : randomBadgeColor(),
        projectId: workspace.id,
      },
    });

    return NextResponse.json(TagSchema.parse(response), {
      headers,
      status: 201,
    });
  },
  {
    requiredPermissions: ["tags.write"],
  },
);
