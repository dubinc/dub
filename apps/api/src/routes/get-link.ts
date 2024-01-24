import { createRoute, z } from "@hono/zod-openapi";

import { prisma } from "@dub/database";
import { linkConstructor } from "@dub/utils";
import { HonoApp } from "../lib/hono";
import { ProjectParamSchema } from "../lib/schemas";

const QuerySchema = z.object({
  domain: z.string().min(1).openapi({
    description:
      "The domain of the link to retrieve. E.g. for dub.sh/github, the domain is 'dub.sh'.",
  }),
  key: z.string().min(1).openapi({
    description:
      "The key of the link to retrieve. E.g. for dub.sh/github, the key is 'github'.",
  }),
});

const ResponseSchema = z.object({
  id: z.string().openapi({ description: "" }),
  domain: z.string().openapi({ description: "" }),
  key: z.string().openapi({ description: "" }),
  url: z.string().openapi({ description: "" }),
  shortLink: z.string().openapi({ description: "" }),
});

// Get a specific link
const route = createRoute({
  method: "get",
  path: "/api/v1/projects/{projectSlug}/links",
  security: [{ bearerAuth: [] }],
  request: {
    params: ProjectParamSchema,
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "Link found",
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
    },
  },
});

export const getLinkApi = (app: HonoApp) => {
  app.openapi(route, async (c) => {
    const { key, domain } = c.req.query();

    // const p = c.get("project");
    // console.log({ p });

    const response = await prisma.link.findUniqueOrThrow({
      where: {
        domain_key: {
          domain,
          key,
        },
      },
    });

    return c.json({
      ...response,
      shortLink: linkConstructor({
        domain,
        key,
      }),
    });
  });
};
