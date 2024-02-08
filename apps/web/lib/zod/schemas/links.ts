import z from "@/lib/zod";
import { LinkSchema } from "prisma/zod";
import { ZodOpenApiOperationObject, ZodOpenApiPathsObject } from "zod-openapi";

// TODO: Add openapi description for each field
export const LinkSchemaOpenApi = LinkSchema.extend({
  geo: z.record(z.string()).optional().nullable(), // TODO: Add proper type
});

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
});

export const CreateLinkBodySchema = z.object({
  domain: z.string().optional().openapi({
    description:
      "The domain of the short link. If not provided, the primary domain for the project will be used (or `dub.sh` if the project has no domains).",
  }),
  key: z.string().optional().openapi({
    description:
      "The short link slug. If not provided, a random 7-character slug will be generated.",
  }),
  url: z.string().url().openapi({
    description: "The destination URL of the short link.",
  }),
  archived: z.boolean().optional().openapi({
    description: "Whether the short link is archived.",
    default: false,
  }),
  expiresAt: z
    .string()
    .datetime({
      message: "Invalid expiry date. Expiry date must be in ISO-8601 format.",
    })
    .optional()
    .nullable()
    .openapi({
      description:
        "The date and time when the short link will expire in ISO-8601 format. Must be in the future.",
    })
    .refine(
      (expiresAt) => {
        return expiresAt ? new Date(expiresAt) > new Date() : true;
      },
      {
        message: "Expiry date must be in the future.",
      },
    ),
  password: z.string().optional().nullable().openapi({
    description:
      "The password required to access the destination URL of the short link.",
  }),
  proxy: z.boolean().optional().openapi({
    description:
      "Whether the short link uses Custom Social Media Cards feature.",
    default: false,
  }),
  title: z.string().optional().openapi({
    description:
      "The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom Social Media Cards if `proxy` is true.",
  }),
  description: z.string().optional().openapi({
    description:
      "The description of the short link generated via `api.dub.co/metatags`. Will be used for Custom Social Media Cards if `proxy` is true.",
  }),
  image: z.string().optional().openapi({
    description:
      "The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom Social Media Cards if `proxy` is true.",
  }),
  rewrite: z.boolean().optional().openapi({
    description: "Whether the short link uses link cloaking.",
    default: false,
  }),
  ios: z.string().optional().nullable().openapi({
    description:
      "The iOS destination URL for the short link for iOS device targeting.",
  }),
  android: z.string().optional().nullable().openapi({
    description:
      "The Android destination URL for the short link for Android device targeting.",
  }),
  geo: z.record(z.string()).optional().nullable().openapi({
    description:
      "Geo targeting information for the short link in JSON format `{[COUNTRY]: https://example.com }`.",
  }),
  publicStats: z.boolean().optional().openapi({
    description: "Whether the short link's stats are publicly accessible.",
    default: false,
  }),
  tagId: z.string().optional().nullable().openapi({
    description: "The tag ID to assign to the short link.",
  }),
  comments: z.string().optional().nullable().openapi({
    description: "The comments for the short link.",
  }),
});

export type Link = z.infer<typeof LinkSchema>;
export type CreateLinkBody = z.infer<typeof CreateLinkBodySchema>;

const getLinkInfo: ZodOpenApiOperationObject = {
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

const getLinks: ZodOpenApiOperationObject = {
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

const createLink: ZodOpenApiOperationObject = {
  operationId: "createLink",
  summary: "Create a new link",
  description: "Create a new link for the authenticated project.",
  requestBody: {
    content: {
      "application/json": {
        schema: CreateLinkBodySchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The link was created",
      content: {
        "application/json": {
          schema: LinkSchemaOpenApi,
        },
      },
    },
  },
};

export const linkPaths: ZodOpenApiPathsObject = {
  "/links": {
    get: getLinks,
    post: createLink,
  },
  "/links/info": {
    get: getLinkInfo,
  },
};
