import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

const GetProjectParamSchema = z.object({
  projectSlug: z.string().openapi({ description: "Project slug" }),
});

const ProjectSchema = z.object({
  id: z.string(),
  projectSlug: z.string(),
});

const route = createRoute({
  method: "post",
  path: "/v1/projects/{projectSlug}",
  security: [{ bearerAuth: [] }],
  request: {
    params: GetProjectParamSchema,
  },
  responses: {
    200: {
      description: "Project found",
      content: {
        "application/json": {
          schema: ProjectSchema,
        },
      },
    },
  },
});

export const getProjectApi = (app: OpenAPIHono) => {
  app.openapi(route, (c) => {
    const projectSlug = c.req.param("projectSlug");

    return c.json({
      id: "123",
      projectSlug,
    });
  });
};
