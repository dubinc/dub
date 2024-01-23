import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

import { prisma } from "@dub/database";
import { ProjectParamSchema } from "../lib/schema";

const ResponseSchema = z.object({
  id: z.string().openapi({ description: "The unique ID of the project." }),
  name: z.string().openapi({ description: "The name of the project." }),
  slug: z.string().openapi({ description: "The slug of the project." }),
  logo: z
    .string()
    .nullable()
    .openapi({ description: "The logo of the project." }),
  usage: z.number().openapi({ description: "The usage of the project." }),
  usageLimit: z
    .number()
    .openapi({ description: "The usage limit of the project." }),
  plan: z.string().openapi({ description: "The plan of the project." }),
  createdAt: z.string().openapi({
    description: "The date and time when the project was created.",
  }),
  // users: z.object({
  //   role: z
  //     .string()
  //     .openapi({
  //       description: "The role of the authenticated user in the project.",
  //     }),
  // }),
  // domains: z.array(
  //   z.object({
  //     slug: z.string().openapi({ description: "The domains of the project." }),
  //   }),
  // ),
});

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
          schema: ResponseSchema,
        },
      },
    },
  },
});

export const getProjectApi = (app: OpenAPIHono) => {
  app.openapi(route, async (c) => {
    const projectSlug = c.req.param("projectSlug");

    const { id, name, slug, logo, usage, usageLimit, plan, createdAt } =
      await prisma.project.findUniqueOrThrow({
        where: {
          slug: projectSlug,
        },
      });

    return c.json({
      id,
      name,
      slug,
      logo,
      usage,
      usageLimit,
      plan,
      createdAt,
    });
  });
};
