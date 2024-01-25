import { createRoute, z } from "@hono/zod-openapi";

import { prisma } from "@dub/database";
import { HonoApp } from "../lib/hono";
import { ProjectParamSchema, ProjectSchema } from "../lib/schemas/dub";
import { openApiErrorResponses } from "../lib/schemas/openapi";

// Get a specific project
const route = createRoute({
  method: "get",
  path: "/api/v1/projects/{projectSlug}",
  security: [{ bearerAuth: [] }],
  request: {
    params: ProjectParamSchema,
  },
  responses: {
    200: {
      description: "Project found",
      content: {
        "application/json": {
          schema: z.object({
            ...ProjectSchema.shape,
            users: z.array(
              z.object({
                role: z.string().openapi({
                  description:
                    "The role of the authenticated user in the project.",
                }),
              }),
            ),
            domains: z.array(
              z.object({
                slug: z
                  .string()
                  .openapi({ description: "The domain of the project." }),
                primary: z.boolean().openapi({
                  description:
                    "Whether the domain is the primary domain of the project.",
                }),
              }),
            ),
          }),
        },
      },
    },
    ...openApiErrorResponses,
  },
});

export const getProjectHandler = (app: HonoApp) => {
  app.openapi(route, async (c) => {
    const projectSlug = c.req.param("projectSlug");
    const user = c.get("user");

    const project = await prisma.project.findUniqueOrThrow({
      where: {
        slug: projectSlug,
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
        users: {
          where: {
            userId: user.id,
          },
          select: {
            role: true,
          },
        },
        domains: {
          select: {
            slug: true,
            primary: true,
          },
        },
      },
    });

    return c.json(project);
  });
};
