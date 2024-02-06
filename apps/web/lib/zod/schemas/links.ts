import z from "@/lib/zod";
import { LinkSchema } from "prisma/zod";
import { ZodOpenApiOperationObject, ZodOpenApiPathsObject } from "zod-openapi";

export const LinkSchemaOpenApi = LinkSchema;

export type Link = z.infer<typeof LinkSchema>;

export const GetLinkInfoQuery = z.object({
  projectSlug: z.string().openapi({
    description:
      "The slug for the project that the link belongs to. E.g. for `app.dub.co/acme`, the projectSlug is `acme`.",
  }),
  domain: z.string().openapi({
    description:
      "The domain of the link to retrieve. E.g. for `dub.sh/github`, the domain is `dub.sh`.",
  }),
  key: z.string().openapi({
    description:
      "The key of the link to retrieve. E.g. for `dub.sh/github`, the key is `github`.",
  }),
});

export const GetLinksQuery = z.object({
  projectSlug: z.string().openapi({
    description:
      "The slug for the project that the link belongs to. E.g. for `app.dub.co/acme`, the projectSlug is `acme`.",
  }),
  domain: z.string().optional().openapi({
    description:
      "The domain to filter the links by. E.g. `ac.me`. If not provided, all links for the project will be returned.",
  }),
  tagId: z.string().optional().openapi({
    description: "The tag ID to filter the links by.",
  }),
  search: z.string().optional().openapi({
    description:
      "The search term to filter the links by. The search term will be matched against the short link slug and the destination url.",
  }),
  sort: z.enum(["createdAt", "clicks", "lastClicked"]).optional().openapi({
    description:
      "The field to sort the links by. The default is `createdAt`, and sort order is always descending.",
  }),
  page: z.coerce.number().optional().openapi({
    description:
      "The page number for pagination (each page contains 100 links).",
  }),
  userId: z.string().optional().openapi({
    description: "The user ID to filter the links by.",
  }),
  showArchived: z.coerce.boolean().optional().openapi({
    description:
      "Whether to include archived links in the response. Defaults to `false` if not provided.",
  }),
})

export const getLinkInfo: ZodOpenApiOperationObject = {
  operationId: "getLinkInfo",
  summary: "Retrieve a link",
  description: "Retrieve the info for a link from their domain and key.",
  requestParams: {
    query: GetLinkInfoQuery,
  },
  responses: {
    "200": {
      description: "Link info was found",
      content: {
        "application/json": {
          schema: LinkSchemaOpenApi,
        },
      },
    },
  },
};

export const getLinks: ZodOpenApiOperationObject = {
  operationId: "getLinks",
  summary: "Retrieve a list of links",
  description:
    "Retrieve a list of links for the authenticated project. The list will be paginated and the provided query parameters allow filtering the returned links.",
  requestParams: {
    query: GetLinksQuery,
  },
  responses: {
    "200": {
      description: "The links were found",
      content: {
        "application/json": {
          schema: z.array(LinkSchemaOpenApi),
        },
      },
    },
  },
};

export const linkPaths: ZodOpenApiPathsObject = {
  "/links/info": {
    get: getLinkInfo,
  },
  "/links": {
    get: getLinks,
  },
};
