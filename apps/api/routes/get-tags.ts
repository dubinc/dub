import { createRoute, z } from "@hono/zod-openapi";

import { prisma } from "@dub/database";
import { HonoApp } from "../lib/hono";
import { authorizeAndRetrieveProject } from "../lib/projects";
import {
  ProjectParamSchema,
  TagSchema,
  openApiErrorResponses,
} from "../lib/schemas";

// Get a specific project
const route = createRoute({
  method: "get",
  path: "/api/v1/projects/{projectSlug}/tags",
  security: [{ bearerAuth: [] }],
  request: {
    params: ProjectParamSchema,
  },
  responses: {
    200: {
      description: "List of tags",
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(TagSchema),
          }),
        },
      },
    },
  },
  ...openApiErrorResponses,
});

export const getTagsHandler = (app: HonoApp) => {
  app.openapi(route, async (c) => {
    const { project } = await authorizeAndRetrieveProject(c);

    const tags = await prisma.tag.findMany({
      where: {
        projectId: project.id,
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return c.json({
      data: tags,
    });
  });
};
