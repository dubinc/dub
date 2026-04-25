import { ABTestVariantsSchema } from "@/lib/zod/schemas/ab-tests";
import {
  base64ImageSchema,
  preprocessLinkPreviewImage,
  publicHostedImageSchema,
  uploadedImageSchema,
} from "@/lib/zod/schemas/images";
import {
  DESTINATION_URL_MAX_LENGTH,
  SLUG_REGEX,
  parseUrlSchema,
} from "@dub/utils";
import * as z from "zod/v4";

export const getLinksQuerySchema = z.object({
  domain: z
    .string()
    .optional()
    .describe("The domain to filter the links by. E.g. `dub.sh`."),
  tagId: z
    .string()
    .optional()
    .describe("Deprecated: Use `tagIds` instead. The tag ID to filter the links by."),
  tagIds: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")))
    .optional()
    .describe("The tag IDs to filter the links by."),
  tagNames: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")))
    .optional()
    .describe("The unique name of the tags assigned to the short link (case insensitive)."),
  folderId: z
    .string()
    .optional()
    .describe("The folder ID to filter the links by."),
  search: z
    .string()
    .optional()
    .describe(
      "The search term to filter the links by. The search term will be matched against the short link slug and the destination URL.",
    ),
  userId: z
    .string()
    .optional()
    .describe("The user ID to filter the links by."),
  tenantId: z
    .string()
    .optional()
    .describe("The tenant ID to filter the links by."),
  showArchived: z
    .boolean()
    .default(false)
    .describe(
      "Whether to include archived links in the response. Defaults to `false` if not provided.",
    ),
  withTags: z
    .boolean()
    .default(false)
    .describe(
      "Whether to include tags in the response. Defaults to `false` if not provided.",
    ),
  sort: z
    .enum(["createdAt", "clicks", "lastClickedAt"])
    .default("createdAt")
    .describe(
      "The field to sort the links by. The allowed values are: `createdAt`, `clicks`, `lastClickedAt`. Defaults to `createdAt` if not provided.",
    ),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1)
    .describe(
      "The page number for pagination (each page contains 100 links). Defaults to `1` if not provided.",
    ),
});

export const getLinksQuerySchemaExtended = getLinksQuerySchema.extend({
  includeProgramEnrollment: z.boolean().default(false),
});

export const createLinkBodySchema = z.object({
  url: parseUrlSchema
    .describe("The destination URL of the short link.")
    .meta({
      example: "https://google.com",
      maxLength: DESTINATION_URL_MAX_LENGTH,
    }),
  domain: z
    .string()
    .optional()
    .describe(
      "The domain of the short link. If not provided, the primary domain for the workspace will be used (or `dub.sh` if the workspace has no domains).",
    ),
  key: z
    .string()
    .regex(SLUG_REGEX, {
      message: "Invalid key format – must be alphanumeric with dashes.",
    })
    .max(100)
    .optional()
    .describe(
      "The short link slug. If not provided, a random 7-character slug will be generated.",
    )
    .meta({ example: "github" }),
  keyLength: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe(
      "The length of the random slug to generate. If not provided, a 7-character slug will be generated.",
    )
    .meta({ example: 7 }),
  externalId: z
    .string()
    .max(255)
    .nullish()
    .describe(
      "The ID of the link in your database. If set, it can be used to identify the link in future API requests (must be prefixed with 'ext_' when passed as a query parameter). This key is unique across your workspace.",
    )
    .meta({ example: "123456" }),
  tenantId: z
    .string()
    .max(255)
    .nullish()
    .describe(
      "The ID of the tenant that created the link inside your system. If set, it can be used to fetch all links for a tenant.",
    ),
  programId: z
    .string()
    .nullish()
    .describe("The ID of the program the short link is associated with."),
  partnerId: z
    .string()
    .nullish()
    .describe("The ID of the partner the short link is associated with."),
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
  tagIds: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")))
    .optional()
    .describe("The unique IDs of the tags assigned to the short link.")
    .meta({ example: ["clux0rgak00011..."] }),
  tagNames: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")))
    .optional()
    .describe(
      "The unique name of the tags assigned to the short link (case insensitive).",
    ),
  folderId: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .nullish()
    .describe("The unique ID existing folder to assign the short link to."),
  comments: z.string().nullish().describe("The comments for the short link."),
  expiresAt: z
    .string()
    .nullish()
    .describe("The date and time when the short link will expire at."),
  expiredUrl: parseUrlSchema
    .nullish()
    .describe("The URL to redirect to when the short link has expired.")
    .meta({
      maxLength: DESTINATION_URL_MAX_LENGTH,
    }),
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
      "Whether the short link uses Custom Link Previews feature. Defaults to `false` if not provided.",
    ),
  title: z
    .string()
    .nullish()
    .describe(
      "The custom link preview title (og:title). Will be used for Custom Link Previews if `proxy` is true. Learn more: https://d.to/og",
    ),
  description: z
    .string()
    .nullish()
    .describe(
      "The custom link preview description (og:description). Will be used for Custom Link Previews if `proxy` is true. Learn more: https://d.to/og",
    ),
  image: z
    .string()
    .nullish()
    .describe(
      "The custom link preview image (og:image). Will be used for Custom Link Previews if `proxy` is true. Learn more: https://d.to/og",
    ),
  video: z
    .string()
    .nullish()
    .describe(
      "The custom link preview video (og:video). Will be used for Custom Link Previews if `proxy` is true. Learn more: https://d.to/og",
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
    .record(z.string(), parseUrlSchema)
    .nullish()
    .describe(
      "Geo targeting information for the short link in JSON format `{[COUNTRY]: https://example.com }`. See https://d.to/geo for more information.",
    )
    .meta({ id: "linkGeoTargeting" }),
  doIndex: z
    .boolean()
    .optional()
    .describe(
      "Allow search engines to index your short link. Defaults to `false` if not provided. Learn more: https://d.to/noindex",
    ),
  utm_source: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .nullish()
    .describe(
      "The UTM source of the short link. If set, this will populate or override the UTM source in the destination URL.",
    ),
  utm_medium: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .nullish()
    .describe(
      "The UTM medium of the short link. If set, this will populate or override the UTM medium in the destination URL.",
    ),
  utm_campaign: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .nullish()
    .describe(
      "The UTM campaign of the short link. If set, this will populate or override the UTM campaign in the destination URL.",
    ),
  utm_term: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .nullish()
    .describe(
      "The UTM term of the short link. If set, this will populate or override the UTM term in the destination URL.",
    ),
  utm_content: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .nullish()
    .describe(
      "The UTM content of the short link. If set, this will populate or override the UTM content in the destination URL.",
    ),
  ref: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .nullish()
    .describe(
      "The referral tag of the short link. If set, this will populate or override the `ref` query parameter in the destination URL.",
    ),
  webhookIds: z
    .array(z.string())
    .nullish()
    .describe(
      "An array of webhook IDs to trigger when the link is clicked. These webhooks will receive click event data.",
    ),
  testVariants: ABTestVariantsSchema.nullish(),
  testStartedAt: z
    .string()
    .nullish()
    .describe("The date and time when the tests started."),
  testCompletedAt: z
    .string()
    .nullish()
    .describe("The date and time when the tests were or will be completed."),

  // deprecated fields
  publicStats: z
    .boolean()
    .optional()
    .describe(
      "Deprecated: Use `dashboard` instead. Whether the short link's stats are publicly accessible. Defaults to `false` if not provided.",
    )
    .meta({ deprecated: true }),
  tagId: z
    .string()
    .nullish()
    .describe(
      "Deprecated: Use `tagIds` instead. The unique ID of the tag assigned to the short link.",
    )
    .meta({ deprecated: true }),
});

export const createLinkBodySchemaAsync = createLinkBodySchema.extend({
  image: z.preprocess(preprocessLinkPreviewImage, uploadedImageSchema.nullish()),
});

export const updateLinkBodySchema = createLinkBodySchemaAsync
  .omit({ keyLength: true, prefix: true })
  .partial();

export const updateLinkBodySchemaExtended = updateLinkBodySchema.extend({
  linkRetentionCleanupDisabledAt: z.string().nullish(),
});

export const bulkCreateLinksBodySchema = z
  .array(createLinkBodySchemaAsync)
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
  data: createLinkBodySchemaAsync
    .omit({
      domain: true,
      key: true,
      externalId: true,
      keyLength: true,
      prefix: true,
    })
    .extend({
      url: parseUrlSchema
        .describe("The destination URL of the short link.")
        .meta({
          example: "https://google.com",
        })
        .optional(),
    }),
});

export const bulkDeleteLinksBodySchema = z.object({
  linkIds: z
    .array(z.string())
    .describe("The IDs of the links to delete.")
    .max(100, "You can only delete up to 100 links at a time.")
    .default([]),
  externalIds: z
    .array(z.string())
    .describe("The external IDs of the links to delete.")
    .max(100, "You can only delete up to 100 links at a time.")
    .default([]),
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
      )
      .meta({ example: "github" }),
    url: z
      .string()
      .describe("The destination URL of the short link.")
      .meta({ example: "https://github.com/dubinc/dub" }),
    trackConversion: z
      .boolean()
      .default(false)
      .describe(
        "Whether to track conversions for the short link. Defaults to `false` if not provided.",
      ),
    archived: z
      .boolean()
      .default(false)
      .describe(
        "Whether the short link is archived. Defaults to `false` if not provided.",
      ),
    expiresAt: z
      .string()
      .nullish()
      .describe(
        "The date and time when the short link will expire at in ISO 8601 format.",
      ),
    expiredUrl: z
      .string()
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
      .default(false)
      .describe(
        "Whether the short link uses Custom Link Previews feature. Defaults to `false` if not provided.",
      ),
    title: z
      .string()
      .nullish()
      .describe(
        "The custom link preview title (og:title). Will be used for Custom Link Previews if `proxy` is true. Learn more: https://d.to/og",
      ),
    description: z
      .string()
      .nullish()
      .describe(
        "The custom link preview description (og:description). Will be used for Custom Link Previews if `proxy` is true. Learn more: https://d.to/og",
      ),
    image: z
      .string()
      .nullish()
      .describe(
        "The custom link preview image (og:image). Will be used for Custom Link Previews if `proxy` is true. Learn more: https://d.to/og",
      ),
    video: z
      .string()
      .nullish()
      .describe(
        "The custom link preview video (og:video). Will be used for Custom Link Previews if `proxy` is true. Learn more: https://d.to/og",
      ),
    rewrite: z
      .boolean()
      .default(false)
      .describe(
        "Whether the short link uses link cloaking. Defaults to `false` if not provided.",
      ),
    doIndex: z
      .boolean()
      .default(false)
      .describe(
        "Allow search engines to index your short link. Defaults to `false` if not provided. Learn more: https://d.to/noindex",
      ),
    ios: z
      .string()
      .nullish()
      .describe(
        "The iOS destination URL for the short link for iOS device targeting.",
      ),
    android: z
      .string()
      .nullish()
      .describe(
        "The Android destination URL for the short link for Android device targeting.",
      ),
    geo: z
      .record(z.string(), z.string())
      .nullish()
      .describe(
        "Geo targeting information for the short link in JSON format `{[COUNTRY]: https://example.com }`. See https://d.to/geo for more information.",
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
    webhookIds: z
      .array(z.string())
      .default([])
      .describe(
        "An array of webhook IDs to trigger when the link is clicked. These webhooks will receive click event data.",
      ),
    testVariants: ABTestVariantsSchema.nullish(),
    testStartedAt: z
      .string()
      .nullish()
      .describe("The date and time when the tests started."),
    testCompletedAt: z
      .string()
      .nullish()
      .describe("The date and time when the tests were or will be completed."),
    userId: z.string().describe("The ID of the user who created the short link."),
    projectId: z
      .string()
      .describe("The ID of the workspace the short link belongs to."),
    createdAt: z
      .string()
      .describe("The date and time when the short link was created."),
    updatedAt: z
      .string()
      .describe("The date and time when the short link was last updated."),
    clicks: z
      .number()
      .default(0)
      .describe("The number of clicks on the short link."),
    lastClickedAt: z
      .string()
      .nullish()
      .describe("The date and time when the short link was last clicked."),
    leads: z
      .number()
      .default(0)
      .describe("The number of leads generated by the short link."),
    sales: z
      .number()
      .default(0)
      .describe("The number of sales generated by the short link."),
    saleAmount: z
      .number()
      .default(0)
      .describe("The total sale amount generated by the short link."),
  });

export const LinkSchemaArray = z.array(LinkSchema);
