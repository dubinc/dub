import { z } from "@hono/zod-openapi";

export const LinkResponseSchema = z.object({
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
  expiresAt: z.string().nullable().openapi({
    description:
      "The date and time when the short link will expire in ISO-8601 format. Must be in the future.",
  }),
  password: z.string().nullable().openapi({
    description:
      "The password required to access the destination URL of the short link.",
  }),
  proxy: z.boolean().default(false).openapi({
    description:
      "Whether the short link uses Custom Social Media Cards feature.",
  }),
  title: z.string().nullable().openapi({
    description:
      "The title of the short link generated via api.dub.co/metatags. Will be used for Custom Social Media Cards if `proxy` is true.",
  }),
  description: z.string().nullable().openapi({
    description:
      "The description of the short link generated via api.dub.co/metatags. Will be used for Custom Social Media Cards if `proxy` is true.",
  }),
  image: z.string().nullable().openapi({
    description:
      "The image of the short link generated via api.dub.co/metatags. Will be used for Custom Social Media Cards if `proxy` is true.",
  }),
  rewrite: z.boolean().default(false).openapi({
    description: "Whether the short link uses link cloaking.",
  }),
  ios: z.string().nullable().openapi({
    description:
      "The iOS destination URL for the short link for iOS device targeting.",
  }),
  android: z.string().nullable().openapi({
    description:
      "The Android destination URL for the short link for Android device targeting.",
  }),
  geo: z.object({}).nullable().openapi({
    description: `Geo targeting information for the short link in JSON format {[COUNTRY]: "https://example.com" }. Learn more: https://dub.sh/geo`,
  }),
  publicStats: z.boolean().default(false).openapi({
    description: "Whether the short link's stats are publicly accessible.",
  }),
  tagId: z.string().nullable().openapi({
    description: "The unique id of the tag assigned to the short link.",
  }),
  comments: z.string().nullable().openapi({
    description: "The comments for the short link.",
  }),
  shortLink: z.string().openapi({
    description:
      "The full URL of the short link, including the https protocol (e.g. https://dub.sh/try).",
  }),
  utm_source: z.string().nullable().openapi({
    description: "The UTM source of the short link.",
  }),
  utm_medium: z.string().nullable().openapi({
    description: "The UTM medium of the short link.",
  }),
  utm_campaign: z.string().nullable().openapi({
    description: "The UTM campaign of the short link.",
  }),
  utm_term: z.string().nullable().openapi({
    description: "The UTM term of the short link.",
  }),
  utm_content: z.string().nullable().openapi({
    description: "The UTM content of the short link.",
  }),
  userId: z.string().nullable().openapi({
    description: "The user ID of the creator of the short link.",
  }),
  projectId: z.string().nullable().openapi({
    description: "The project ID of the short link.",
  }),
  clicks: z.number().default(0).openapi({
    description: "The number of clicks on the short link.",
  }),
  lastClicked: z.string().nullable().openapi({
    description: "The date and time when the short link was last clicked.",
  }),
  createdAt: z.string().openapi({
    description: "The date and time when the short link was created.",
  }),
  updatedAt: z.string().openapi({
    description: "The date and time when the short link was last updated.",
  }),
});
