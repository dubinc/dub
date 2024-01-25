import { createRoute, z } from "@hono/zod-openapi";

import { prisma } from "@dub/database";
import { HonoApp } from "../lib/hono";
import { ProjectSchema } from "../lib/schemas/dub";
import { openApiErrorResponses } from "../lib/schemas/openapi";

// Get a specific project
const route = createRoute({
  method: "get",
  path: "/api/v1/projects",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "List of projects",
      content: {
        "application/json": {
          schema: z.array(ProjectSchema),
        },
      },
    },
  },
  ...openApiErrorResponses,
});

export const getProjectsHandler = (app: HonoApp) => {
  app.openapi(route, async (c) => {
    const user = c.get("user");

    const projects = await prisma.project.findMany({
      where: {
        users: {
          some: {
            userId: user.id,
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        usage: true,
        usageLimit: true,
        plan: true,
        stripeId: true,
        billingCycleStart: true,
        createdAt: true,
      },
    });

    return c.json(projects);
  });
};
