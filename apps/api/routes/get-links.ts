import { createRoute, z } from "@hono/zod-openapi";

import { prisma } from "@dub/database";
import { linkConstructor } from "@dub/utils";
import { HonoApp } from "../lib/hono";
import { authorizeAndRetrieveProject } from "../lib/project";
import { LinkResponseSchema, openApiErrorResponses } from "../lib/schemas";

const QuerySchema = z.object({
  projectSlug: z.string().min(1).openapi({
    description:
      "The slug for the project that the link belongs to. E.g. for app.dub.co/acme, the projectSlug is 'acme'.",
  }),
  domain: z.string().optional().openapi({
    description:
      "The domain to filter the links by. E.g. 'ac.me'. If not provided, all links for the project will be returned.",
  }),
  tagId: z.string().optional().openapi({
    description: "The tag ID to filter the links by.",
  }),
  search: z.string().optional().openapi({
    description:
      "The search term to filter the links by. The search term will be matched against the short link slug and the destination url.",
  }),
  sort: z
    .enum(["createdAt", "clicks", "lastClicked"])
    .optional()
    .default("createdAt")
    .openapi({
      description:
        "The field to sort the links by. The default is 'createdAt', and sort order is always descending.",
    }),
  page: z.coerce.number().optional().openapi({
    description:
      "The page number for pagination (each page contains 100 links).",
  }),
  userId: z.string().optional().openapi({
    description: "The user ID to filter the links by.",
  }),
  showArchived: z.coerce.boolean().optional().default(false).openapi({
    description:
      "Whether to include archived links in the response. Defaults to false if not provided.",
  }),
});

// Get a specific link
const route = createRoute({
  method: "get",
  path: "/api/v1/links",
  security: [{ bearerAuth: [] }],
  request: {
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "Retrieve a list of links",
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(LinkResponseSchema),
          }),
        },
      },
    },
    ...openApiErrorResponses,
  },
});

export const getLinksHandler = (app: HonoApp) => {
  app.openapi(route, async (c) => {
    const { project } = await authorizeAndRetrieveProject(c);

    const { domain, tagId, search, sort, page, userId, showArchived } =
      c.req.query();

    const links = await prisma.link.findMany({
      where: {
        projectId: project.id,
        archived: showArchived ? undefined : false,
        ...(domain && { domain }),
        ...(search && {
          OR: [
            {
              key: { contains: search },
            },
            {
              url: { contains: search },
            },
          ],
        }),
        ...(tagId && { tagId }),
        ...(userId && { userId }),
      },
      include: {
        user: true,
      },
      orderBy: {
        [sort ?? "createdAt"]: "desc",
      },
      take: 100,
      ...(page && {
        skip: (parseInt(page) - 1) * 100,
      }),
    });

    const allLinks = links.map((link) => ({
      ...link,
      shortLink: linkConstructor({
        domain: link.domain,
        key: link.key,
      }),
    }));

    return c.json({
      data: allLinks,
    });
  });
};
