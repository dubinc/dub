import z from "@/lib/zod";
import { LinkSchema as Link } from "prisma/zod";

export const GetLinksQuerySchema = z.object({
  projectSlug: z
    .string()
    .describe(
      "The slug for the project that the link belongs to. E.g. for `app.dub.co/acme`, the projectSlug is `acme`.",
    ),
  domain: z
    .string()
    .optional()
    .describe(
      "The domain to filter the links by. E.g. `ac.me`. If not provided, all links for the project will be returned.",
    ),
  tagId: z.string().optional().describe("The tag ID to filter the links by."),
  search: z
    .string()
    .optional()
    .describe(
      "The search term to filter the links by. The search term will be matched against the short link slug and the destination url.",
    ),
  sort: z
    .enum(["createdAt", "clicks", "lastClicked"])
    .optional()
    .describe(
      "The field to sort the links by. The default is `createdAt`, and sort order is always descending.",
    ),
  page: z.coerce
    .number()
    .optional()
    .describe("The page number for pagination (each page contains 100 links)."),
  userId: z.string().optional().describe("The user ID to filter the links by."),
  showArchived: z.coerce
    .boolean()
    .optional()
    .describe(
      "Whether to include archived links in the response. Defaults to `false` if not provided.",
    ),
});

export const GetLinkInfoQuerySchema = z.object({
  projectSlug: z
    .string()
    .describe(
      "The slug for the project that the link belongs to. E.g. for `app.dub.co/acme`, the projectSlug is `acme`.",
    ),
  domain: z
    .string()
    .describe(
      "The domain of the link to retrieve. E.g. for `dub.sh/github`, the domain is `dub.sh`.",
    ),
  key: z
    .string()
    .describe(
      "The key of the link to retrieve. E.g. for `dub.sh/github`, the key is `github`.",
    ),
});

export const CreateLinkBodySchema = z.object({
  domain: z
    .string()
    .optional()
    .describe(
      "The domain of the short link. If not provided, the primary domain for the project will be used (or `dub.sh` if the project has no domains).",
    ),
  key: z
    .string()
    .optional()
    .describe(
      "The short link slug. If not provided, a random 7-character slug will be generated.",
    ),
  url: z.string().url().describe("The destination URL of the short link."),
  archived: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether the short link is archived."),
  expiresAt: z
    .string()
    .datetime({
      message: "Invalid expiry date. Expiry date must be in ISO-8601 format.",
    })
    .nullish()
    .describe(
      "The date and time when the short link will expire in ISO-8601 format. Must be in the future.",
    )
    .refine(
      (expiresAt) => {
        return expiresAt ? new Date(expiresAt) > new Date() : true;
      },
      {
        message: "Expiry date must be in the future.",
      },
    ),
  password: z
    .string()
    .nullish()
    .describe(
      "The password required to access the destination URL of the short link.",
    ),
  proxy: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether the short link uses Custom Social Media Cards feature."),
  title: z
    .string()
    .nullish()
    .describe(
      "The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom Social Media Cards if `proxy` is true.",
    ),
  description: z
    .string()
    .nullish()
    .describe(
      "The description of the short link generated via `api.dub.co/metatags`. Will be used for Custom Social Media Cards if `proxy` is true.",
    ),
  image: z
    .string()
    .nullish()
    .describe(
      "The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom Social Media Cards if `proxy` is true.",
    ),
  rewrite: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether the short link uses link cloaking."),
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
    .record(z.string())
    .nullish()
    .describe(
      "Geo targeting information for the short link in JSON format `{[COUNTRY]: https://example.com }`.",
    ),
  publicStats: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether the short link's stats are publicly accessible."),
  tagId: z
    .string()
    .nullish()
    .describe("The tag ID to assign to the short link."),
  comments: z.string().nullish().describe("The comments for the short link."),
});

export const BulkCreateLinksBodySchema = z
  .array(CreateLinkBodySchema)
  .max(100, "You can only create up to 100 links at a time.");

// TODO: Add description for each field
// TODO: Add proper type for geo
export const LinkSchema = Link.extend({
  geo: z.record(z.string()).optional().nullable(),
});
