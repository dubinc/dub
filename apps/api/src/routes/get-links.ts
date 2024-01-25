import { createRoute, z } from "@hono/zod-openapi";

import { prisma } from "@dub/database";
import { linkConstructor } from "@dub/utils";
import { HonoApp } from "../lib/hono";
import { authorizeAndRetrieveProject } from "../lib/project";
import { openApiErrorResponses } from "../lib/schemas/openapi";

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
  page: z.number().optional().openapi({
    description:
      "The page number for pagination (each page contains 100 links).",
  }),
  userId: z.string().optional().openapi({
    description: "The user ID to filter the links by.",
  }),
  showArchived: z.boolean().optional().default(false).openapi({
    description:
      "Whether to include archived links in the response. Defaults to false if not provided.",
  }),
});

const LinkResponseSchema = z.object({
  id: z.string().openapi({ description: "The unique ID of the short link." }),
  domain: z.string().openapi({
    description:
      "The domain of the short link. If not provided, the primary domain for the project will be used (or dub.sh if the project has no domains).",
  }),
  key: z.string().openapi({
    description:
      "The short link slug. If not provided, a random 7-character slug will be generated.",
  }),
  url: z
    .string()
    .openapi({ description: "The destination URL of the short link." }),
  archived: z
    .boolean()
    .default(false)
    .openapi({ description: "Whether the short link is archived." }),
  shortLink: z
    .string()
    .openapi({
      description:
        "The full URL of the short link, including the https protocol (e.g. https://dub.sh/try).",
    }),
  // TODO: Add the rest of the fields
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
          schema: z.array(LinkResponseSchema),
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

    return c.json(allLinks);
  });
};
