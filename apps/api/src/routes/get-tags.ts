import { createRoute, z } from "@hono/zod-openapi";

import { prisma } from "@dub/database";
import { HonoApp } from "../lib/hono";
import { authorizeAndRetrieveProject } from "../lib/project";
import { TagSchema } from "../lib/schemas/dub";
import { openApiErrorResponses } from "../lib/schemas/openapi";

// Get a specific project
const route = createRoute({
  method: "get",
  path: "/api/v1/projects/{projectSlug}/tags",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "List of tags",
      content: {
        "application/json": {
          schema: z.array(TagSchema),
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

    return c.json(tags);
  });
};
