import { createRoute, z } from "@hono/zod-openapi";
import { HonoApp } from "../lib/hono";
import { openApiErrorResponses } from "../lib/schemas/openapi";

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
  ...openApiErrorResponses,
});

export const healthCheckApi = (app: HonoApp) => {
  app.openapi(route, async (c) => {
    return c.json({
      status: "ok",
    });
  });
};
