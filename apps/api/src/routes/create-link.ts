import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

const CreateLinkRequestSchema = z.object({
  url: z.string().url().openapi({ description: "The URL to shorten" }),
  domain: z
    .string()
    .openapi({ description: "The domain to use for the shortened URL" }),
});

const LinkSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  shortUrl: z.string().url(),
  domain: z.string(),
});

const route = createRoute({
  method: "post",
  path: "/v1/links",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: CreateLinkRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Link created",
      content: {
        "application/json": {
          schema: LinkSchema,
        },
      },
    },
  },
});

export const createLinkApi = (app: OpenAPIHono) => {
  app.openapi(route, (c) => {
    const { url, domain } = c.req.valid("json");

    return c.json({
      id: "123",
      url,
      shortUrl: "https://hono.app/123",
      domain: domain ?? "hono.app",
    });
  });
};
