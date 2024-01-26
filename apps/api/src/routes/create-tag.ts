import { createRoute, z } from "@hono/zod-openapi";

import { prisma } from "@dub/database";
import { exceededLimitError, PlanProps, randomBadgeColor } from "@dub/utils";
import { DubApiError } from "../lib/errors";
import { HonoApp } from "../lib/hono";
import { authorizeAndRetrieveProject } from "../lib/project";
import {
  openApiErrorResponses,
  ProjectParamSchema,
  TagSchema,
} from "../lib/schemas";

// Create a new tag
const route = createRoute({
  method: "post",
  path: "/api/v1/projects/{projectSlug}/tags",
  security: [{ bearerAuth: [] }],
  request: {
    params: ProjectParamSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            tag: z.string().min(1).openapi({
              description: "The name of the tag to create.",
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Tag created",
      content: {
        "application/json": {
          schema: z.object({
            data: TagSchema,
          }),
        },
      },
    },
  },
  ...openApiErrorResponses,
});

export const createTagHandler = (app: HonoApp) => {
  app.openapi(route, async (c) => {
    const { project } = await authorizeAndRetrieveProject(c);

    const tagsCount = await prisma.tag.count({
      where: {
        projectId: project.id,
      },
    });

    if (tagsCount >= project.tagsLimit) {
      throw new DubApiError({
        code: "exceeded_limit",
        message: exceededLimitError({
          plan: project.plan as PlanProps,
          limit: project.tagsLimit,
          type: "tags",
        }),
      });
    }

    const { tag } = c.req.valid("json");

    const createdTag = await prisma.tag.create({
      data: {
        name: tag,
        color: randomBadgeColor(),
        projectId: project.id,
      },
      select: {
        id: true,
        color: true,
        name: true,
      },
    });

    return c.json({
      data: createdTag,
    });
  });
};
