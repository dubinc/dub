import { ErrorCode } from "@/lib/api/errors";
import z from "@/lib/zod";
import {
  COUNTRY_CODES,
  DUB_FOUNDING_DATE,
  formatDate,
  validDomainRegex,
} from "@dub/utils";
import { booleanQuerySchema, getPaginationQuerySchema } from "./misc";
import { TagSchema } from "./tags";
import {
  parseDateSchema,
  parseUrlSchema,
  parseUrlSchemaAllowEmpty,
} from "./utils";

export const getUrlQuerySchema = z.object({
  url: parseUrlSchema,
});

export const getDomainQuerySchema = z.object({
  domain: z
    .string()
    .min(1, "Missing required `domain` query parameter.")
    .refine((v) => validDomainRegex.test(v), { message: "Invalid domain" }),
});

const LinksQuerySchema = z.object({
  domain: z
    .string()
    .optional()
    .describe(
      "The domain to filter the links by. E.g. `ac.me`. If not provided, all links for the workspace will be returned.",
    ),
  tagId: z
    .string()
    .optional()
    .describe(
      "Deprecated. Use `tagIds` instead. The tag ID to filter the links by.",
    )
    .openapi({ deprecated: true }),
  tagIds: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")))
    .optional()
    .describe("The tag IDs to filter the links by."),
  tagNames: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")))
    .optional()
    .describe(
      "The unique name of the tags assigned to the short link (case insensitive).",
    ),
  search: z
    .string()
    .optional()
    .describe(
      "The search term to filter the links by. The search term will be matched against the short link slug and the destination url.",
    ),
  userId: z.string().optional().describe("The user ID to filter the links by."),
  tenantId: z
    .string()
    .optional()
    .describe(
      "The ID of the tenant that created the link inside your system. If set, will only return links for the specified tenant.",
    ),
  showArchived: booleanQuerySchema
    .optional()
    .default("false")
    .describe(
      "Whether to include archived links in the response. Defaults to `false` if not provided.",
    ),
  withTags: booleanQuerySchema
    .optional()
    .default("false")
    .describe(
      "DEPRECATED. Filter for links that have at least one tag assigned to them.",
    )
    .openapi({ deprecated: true }),
});

const sortBy = z
  .enum(["createdAt", "clicks", "saleAmount", "lastClicked"])
  .optional()
  .default("createdAt")
  .describe("The field to sort the links by. The default is `createdAt`.");

export const getLinksQuerySchemaBase = LinksQuerySchema.merge(
  z.object({
    sortBy,
    sortOrder: z
      .enum(["asc", "desc"])
      .optional()
      .default("desc")
      .describe("The sort order. The default is `desc`."),
    sort: sortBy
      .openapi({ deprecated: true })
      .describe("DEPRECATED. Use `sortBy` instead."),
  }),
).merge(getPaginationQuerySchema({ pageSize: 100 }));

export const getLinksCountQuerySchema = LinksQuerySchema.merge(
  z.object({
    groupBy: z
      .union([z.literal("domain"), z.literal("tagId"), z.literal("userId")])
      .optional()
      .describe("The field to group the links by."),
  }),
);

export const linksExportQuerySchema = getLinksQuerySchemaBase
  .omit({ page: true, pageSize: true })
  .merge(
    z.object({
      columns: z
        .string()
        .transform((v) => v.split(","))
        .describe("The columns to export."),
      start: parseDateSchema
        .refine((value: Date) => value >= DUB_FOUNDING_DATE, {
          message: `The start date cannot be earlier than ${formatDate(DUB_FOUNDING_DATE)}.`,
        })
        .optional()
        .describe("The start date of creation to retrieve links from."),
      end: parseDateSchema
        .describe("The end date of creation to retrieve links from.")
        .optional(),
      interval: z.string().optional().describe("The interval for the export."),
    }),
  );

export const domainKeySchema = z.object({
  domain: z
    .string()
    .min(1, "Domain is required.")
    .describe(
      "The domain of the link to retrieve. E.g. for `d.to/github`, the domain is `d.to`.",
    )
    .refine((v) => validDomainRegex.test(v), {
      message: "Invalid domain format",
    }),
  key: z
    .string()
    .min(1, "Key is required.")
    .describe(
      "The key of the link to retrieve. E.g. for `d.to/github`, the key is `github`.",
    ),
});

export const createLinkBodySchema = z.object({
  url: parseUrlSchemaAllowEmpty()
    .describe("The destination URL of the short link.")
    .openapi({
      example: "https://google.com",
    }),
  domain: z
    .string()
    .max(190)
    .optional()
    .describe(
      "The domain of the short link. If not provided, the primary domain for the workspace will be used (or `dub.sh` if the workspace has no domains).",
    ),
  key: z
    .string()
    .max(190)
    .optional()
    .describe(
      "The short link slug. If not provided, a random 7-character slug will be generated.",
    ),
  externalId: z
    .string()
    .min(1)
    .max(255)
    // remove `ext_` prefix if user passes it
    .transform((v) => (v?.startsWith("ext_") ? v.slice(4) : v))
    .nullish()
    .describe(
      "The ID of the link in your database. If set, it can be used to identify the link in future API requests (must be prefixed with 'ext_' when passed as a query parameter). This key is unique across your workspace.",
    )
    .openapi({ example: "123456" }),
  tenantId: z
    .string()
    .max(255)
    .nullish()
    .describe(
      "The ID of the tenant that created the link inside your system. If set, it can be used to fetch all links for a tenant.",
    ),
  prefix: z
    .string()
    .optional()
    .describe(
      "The prefix of the short link slug for randomly-generated keys (e.g. if prefix is `/c/`, generated keys will be in the `/c/:key` format). Will be ignored if `key` is provided.",
    ),
  trackConversion: z
    .boolean()
    .optional()
    .describe(
      "Whether to track conversions for the short link. Defaults to `false` if not provided.",
    ),
  archived: z
    .boolean()
    .optional()
    .describe(
      "Whether the short link is archived. Defaults to `false` if not provided.",
    ),
  publicStats: z
    .boolean()
    .optional()
    .describe(
      "Deprecated: Use `dashboard` instead. Whether the short link's stats are publicly accessible. Defaults to `false` if not provided.",
    )
    .openapi({ deprecated: true }),
  tagId: z
    .string()
    .nullish()
    .describe(
      "The unique ID of the tag assigned to the short link. This field is deprecated – use `tagIds` instead.",
    )
    .openapi({ deprecated: true }),
  tagIds: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")))
    .optional()
    .describe("The unique IDs of the tags assigned to the short link.")
    .openapi({ example: ["clux0rgak00011..."] }),
  tagNames: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")))
    .optional()
    .describe(
      "The unique name of the tags assigned to the short link (case insensitive).",
    ),
  comments: z.string().nullish().describe("The comments for the short link."),
  expiresAt: z
    .string()
    .nullish()
    .describe("The date and time when the short link will expire at."),
  expiredUrl: parseUrlSchema
    .nullish()
    .describe("The URL to redirect to when the short link has expired."),
  password: z
    .string()
    .nullish()
    .describe(
      "The password required to access the destination URL of the short link.",
    ),
  proxy: z
    .boolean()
    .optional()
    .describe(
      "Whether the short link uses Custom Social Media Cards feature. Defaults to `false` if not provided.",
    ),
  title: z
    .string()
    .nullish()
    .describe(
      "The custom link preview title (og:title). Will be used for Custom Social Media Cards if `proxy` is true. Learn more: https://d.to/og",
    ),
  description: z
    .string()
    .nullish()
    .describe(
      "The custom link preview description (og:description). Will be used for Custom Social Media Cards if `proxy` is true. Learn more: https://d.to/og",
    ),
  image: z
    .string()
    .nullish()
    .describe(
      "The custom link preview image (og:image). Will be used for Custom Social Media Cards if `proxy` is true. Learn more: https://d.to/og",
    ),
  video: z
    .string()
    .nullish()
    .describe(
      "The custom link preview video (og:video). Will be used for Custom Social Media Cards if `proxy` is true. Learn more: https://d.to/og",
    ),
  rewrite: z
    .boolean()
    .optional()
    .describe(
      "Whether the short link uses link cloaking. Defaults to `false` if not provided.",
    ),
  ios: parseUrlSchema
    .nullish()
    .describe(
      "The iOS destination URL for the short link for iOS device targeting.",
    ),
  android: parseUrlSchema
    .nullish()
    .describe(
      "The Android destination URL for the short link for Android device targeting.",
    ),
  geo: z
    .record(z.enum(COUNTRY_CODES), parseUrlSchema)
    .nullish()
    .describe(
      "Geo targeting information for the short link in JSON format `{[COUNTRY]: https://example.com }`.",
    )
    .openapi({ ref: "linkGeoTargeting" }),
  doIndex: z
    .boolean()
    .optional()
    .describe(
      "Allow search engines to index your short link. Defaults to `false` if not provided. Learn more: https://d.to/noindex",
    ),
  utm_source: z
    .string()
    .nullish()
    .describe(
      "The UTM source of the short link. If set, this will populate or override the UTM source in the destination URL.",
    ),
  utm_medium: z
    .string()
    .nullish()
    .describe(
      "The UTM medium of the short link. If set, this will populate or override the UTM medium in the destination URL.",
    ),
  utm_campaign: z
    .string()
    .nullish()
    .describe(
      "The UTM campaign of the short link. If set, this will populate or override the UTM campaign in the destination URL.",
    ),
  utm_term: z
    .string()
    .nullish()
    .describe(
      "The UTM term of the short link. If set, this will populate or override the UTM term in the destination URL.",
    ),
  utm_content: z
    .string()
    .nullish()
    .describe(
      "The UTM content of the short link. If set, this will populate or override the UTM content in the destination URL.",
    ),
  ref: z
    .string()
    .nullish()
    .describe(
      "The referral tag of the short link. If set, this will populate or override the `ref` query parameter in the destination URL.",
    ),
  programId: z
    .string()
    .nullish()
    .describe("The ID of the program the short link is associated with."),
  webhookIds: z
    .array(z.string())
    .nullish()
    .describe(
      "An array of webhook IDs to trigger when the link is clicked. These webhooks will receive click event data.",
    ),
});

export const updateLinkBodySchema = createLinkBodySchema.partial();

export const bulkCreateLinksBodySchema = z
  .array(createLinkBodySchema)
  .min(1, "No links created – you must provide at least one link.")
  .max(100, "You can only create up to 100 links at a time.");

export const bulkUpdateLinksBodySchema = z.object({
  linkIds: z
    .array(z.string())
    .describe(
      "The IDs of the links to update. Takes precedence over `externalIds`.",
    )
    .max(100, "You can only update up to 100 links at a time.")
    .default([]),
  externalIds: z
    .array(z.string())
    .describe(
      "The external IDs of the links to update as stored in your database.",
    )
    .max(100, "You can only update up to 100 links at a time.")
    .refine((v) => v.map((id) => id.replace("ext_", "")))
    .default([]),
  data: createLinkBodySchema
    .omit({
      id: true,
      domain: true,
      key: true,
      externalId: true,
      prefix: true,
    })
    .merge(
      z.object({
        url: parseUrlSchema
          .describe("The destination URL of the short link.")
          .openapi({
            example: "https://google.com",
          })
          .optional(),
      }),
    ),
});

export const LinkSchema = z
  .object({
    id: z.string().describe("The unique ID of the short link."),
    domain: z
      .string()
      .describe(
        "The domain of the short link. If not provided, the primary domain for the workspace will be used (or `dub.sh` if the workspace has no domains).",
      ),
    key: z
      .string()
      .describe(
        "The short link slug. If not provided, a random 7-character slug will be generated.",
      ),
    url: z.string().url().describe("The destination URL of the short link."),
    trackConversion: z
      .boolean()
      .default(false)
      .describe("Whether to track conversions for the short link."),
    externalId: z
      .string()
      .nullable()
      .describe(
        "The ID of the link in your database. If set, it can be used to identify the link in future API requests (must be prefixed with 'ext_' when passed as a query parameter). This key is unique across your workspace.",
      ),
    tenantId: z
      .string()
      .nullable()
      .describe(
        "The ID of the tenant that created the link inside your system. If set, it can be used to fetch all links for a tenant.",
      ),
    archived: z
      .boolean()
      .default(false)
      .describe("Whether the short link is archived."),
    expiresAt: z
      .string()
      .nullable()
      .describe(
        "The date and time when the short link will expire in ISO-8601 format.",
      ),
    expiredUrl: z
      .string()
      .url()
      .nullable()
      .describe("The URL to redirect to when the short link has expired."),
    password: z
      .string()
      .nullable()
      .describe(
        "The password required to access the destination URL of the short link.",
      ),
    proxy: z
      .boolean()
      .default(false)
      .describe(
        "Whether the short link uses Custom Social Media Cards feature.",
      ),
    title: z
      .string()
      .nullable()
      .describe(
        "The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom Social Media Cards if `proxy` is true.",
      ),
    description: z
      .string()
      .nullable()
      .describe(
        "The description of the short link generated via `api.dub.co/metatags`. Will be used for Custom Social Media Cards if `proxy` is true.",
      ),
    image: z
      .string()
      .nullable()
      .describe(
        "The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom Social Media Cards if `proxy` is true.",
      ),
    video: z
      .string()
      .nullable()
      .describe(
        "The custom link preview video (og:video). Will be used for Custom Social Media Cards if `proxy` is true. Learn more: https://d.to/og",
      ),
    rewrite: z
      .boolean()
      .default(false)
      .describe("Whether the short link uses link cloaking."),
    doIndex: z
      .boolean()
      .default(false)
      .describe("Whether to allow search engines to index the short link."),
    ios: z
      .string()
      .nullable()
      .describe(
        "The iOS destination URL for the short link for iOS device targeting.",
      ),
    android: z
      .string()
      .nullable()
      .describe(
        "The Android destination URL for the short link for Android device targeting.",
      ),
    geo: z
      .record(z.enum(COUNTRY_CODES), z.string().url())
      .nullable()
      .describe(
        "Geo targeting information for the short link in JSON format `{[COUNTRY]: https://example.com }`. Learn more: https://d.to/geo",
      ),
    publicStats: z
      .boolean()
      .default(false)
      .describe("Whether the short link's stats are publicly accessible."),
    tagId: z
      .string()
      .nullable()
      .describe(
        "The unique ID of the tag assigned to the short link. This field is deprecated – use `tags` instead.",
      )
      .openapi({ deprecated: true }),
    tags: TagSchema.array()
      .nullable()
      .describe("The tags assigned to the short link."),
    webhookIds: z
      .array(z.string())
      .describe(
        "The IDs of the webhooks that the short link is associated with.",
      ),
    comments: z
      .string()
      .nullable()
      .describe("The comments for the short link."),
    shortLink: z
      .string()
      .url()
      .describe(
        "The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).",
      ),
    qrCode: z
      .string()
      .url()
      .describe(
        "The full URL of the QR code for the short link (e.g. `https://api.dub.co/qr?url=https://dub.sh/try`).",
      ),
    utm_source: z
      .string()
      .nullable()
      .describe("The UTM source of the short link."),
    utm_medium: z
      .string()
      .nullable()
      .describe("The UTM medium of the short link."),
    utm_campaign: z
      .string()
      .nullable()
      .describe("The UTM campaign of the short link."),
    utm_term: z.string().nullable().describe("The UTM term of the short link."),
    utm_content: z
      .string()
      .nullable()
      .describe("The UTM content of the short link."),
    userId: z
      .string()
      .nullable()
      .describe("The user ID of the creator of the short link."),
    workspaceId: z.string().describe("The workspace ID of the short link."),
    clicks: z
      .number()
      .default(0)
      .describe("The number of clicks on the short link."),
    lastClicked: z
      .string()
      .nullable()
      .describe("The date and time when the short link was last clicked."),
    leads: z
      .number()
      .default(0)
      .describe("The number of leads the short links has generated."),
    sales: z
      .number()
      .default(0)
      .describe("The number of sales the short links has generated."),
    saleAmount: z
      .number()
      .default(0)
      .describe(
        "The total dollar amount of sales the short links has generated (in cents).",
      ),
    createdAt: z
      .string()
      .describe("The date and time when the short link was created."),
    updatedAt: z
      .string()
      .describe("The date and time when the short link was last updated."),
    projectId: z
      .string()
      .describe(
        "The project ID of the short link. This field is deprecated – use `workspaceId` instead.",
      )
      .openapi({ deprecated: true }),
    programId: z
      .string()
      .nullable()
      .describe("The ID of the program the short link is associated with."),
  })
  .openapi({ title: "Link" });

export const LinkErrorSchema = z
  .object({
    link: z.any().describe("The link that caused the error."),
    error: z.string().describe("The error message."),
    code: ErrorCode.describe("The error code."),
  })
  .openapi({ title: "LinkError" });

export const getLinkInfoQuerySchema = domainKeySchema.partial().merge(
  z.object({
    linkId: z
      .string()
      .optional()
      .describe("The unique ID of the short link.")
      .openapi({ example: "clux0rgak00011..." }),
    externalId: z
      .string()
      .optional()
      .describe("This is the ID of the link in the your database.")
      .openapi({ example: "123456" }),
  }),
);
export const getLinksQuerySchemaExtended = getLinksQuerySchemaBase.merge(
  z.object({
    // Only Dub UI uses the following query parameters
    includeUser: booleanQuerySchema.default("false"),
    includeWebhooks: booleanQuerySchema.default("false"),
    includeDashboard: booleanQuerySchema.default("false"),
    linkIds: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : v.split(",")))
      .optional()
      .describe("Link IDs to filter by."),
  }),
);

export const linkEventSchema = LinkSchema.extend({
  // here we use string because url can be empty
  url: z.string(),
  expiredUrl: z.string().nullable(),
  // coerce boolean fields
  archived: z.coerce.boolean(),
  doIndex: z.coerce.boolean(),
  proxy: z.coerce.boolean(),
  publicStats: z.coerce.boolean(),
  rewrite: z.coerce.boolean(),
  trackConversion: z.coerce.boolean(),
  // coerce date fields
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  lastClicked: z.coerce.date(),
  expiresAt: z.coerce.date(),
  // userId can be null
  userId: z.string().nullable(),
});
