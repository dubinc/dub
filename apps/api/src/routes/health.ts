import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

const HealthSchema = z.object({
  status: z.string(),
});

const route = createRoute({
  method: "get",
  path: "/api/v1/health",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Health check",
      content: {
        "application/json": {
          schema: HealthSchema,
        },
      },
    },
  },
});

export const healthCheckApi = (app: OpenAPIHono) => {
  app.openapi(route, async (c) => {
    return c.json({
      status: "ok",
    });
  });
};
