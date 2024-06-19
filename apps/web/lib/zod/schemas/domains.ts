import z from "@/lib/zod";
import { parseUrlSchema } from "./utils";

export const DomainSchema = z.object({
  id: z.string().describe("The unique identifier of the domain."),
  slug: z
    .string()
    .describe("The domain name.")
    .openapi({ example: "acme.com" }),
  verified: z
    .boolean()
    .default(false)
    .describe("Whether the domain is verified."),
  primary: z
    .boolean()
    .default(false)
    .describe("Whether the domain is the primary domain for the workspace."),
  archived: z
    .boolean()
    .describe("Whether the domain is archived.")
    .default(false),
  noindex: z
    .boolean()
    .describe("Prevent search engines from indexing the domain.")
    .default(false),
  placeholder: z
    .string()
    .describe(
      "Provide context to your teammates in the link creation modal by showing them an example of a link to be shortened.",
    )
    .default("https://dub.co/help/article/what-is-dub")
    .openapi({ example: "https://dub.co/help/article/what-is-dub" }),
  expiredUrl: z
    .string()
    .nullish()
    .describe(
      "The URL to redirect to when a link under this domain has expired.",
    )
    .openapi({ example: "https://acme.com/expired" }),
  target: z
    .string()
    .nullish()
    .describe(
      "The page your users will get redirected to when they visit your domain.",
    )
    .openapi({ example: "https://acme.com/landing" }),
  type: z
    .string()
    .describe("The type of redirect to use for this domain.")
    .openapi({ enum: ["redirect", "rewrite"] }),
  clicks: z.number().describe("The number of clicks on the domain.").default(0),
  createdAt: z.date().describe("The date the domain was created."),
  updatedAt: z.date().describe("The date the domain was last updated."),
});

export const createDomainBodySchema = z.object({
  slug: z
    .string({ required_error: "slug is required" })
    .min(1, "slug cannot be empty.")
    .describe("Name of the domain.")
    .openapi({ example: "acme.com" }),
  type: z
    .enum(["redirect", "rewrite"])
    .optional()
    .default("redirect")
    .describe("The type of redirect to use for this domain.")
    .openapi({ example: "redirect" }),
  target: parseUrlSchema
    .nullish()
    .describe(
      "The page your users will get redirected to when they visit your domain.",
    )
    .openapi({ example: "https://acme.com/landing" }),
  expiredUrl: parseUrlSchema
    .nullish()
    .describe(
      "Redirect users to a specific URL when any link under this domain has expired.",
    )
    .openapi({ example: "https://acme.com/expired" }),
  archived: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Whether to archive this domain. `false` will unarchive a previously archived domain.",
    )
    .openapi({ example: false }),
  noindex: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Prevent search engines from indexing the domain. Defaults to `false`.",
    )
    .openapi({ example: false }),
  placeholder: parseUrlSchema
    .nullish()
    .default("https://dub.co/help/article/what-is-dub")
    .describe(
      "Provide context to your teammates in the link creation modal by showing them an example of a link to be shortened.",
    )
    .openapi({ example: "https://dub.co/help/article/what-is-dub" }),
});

export const updateDomainBodySchema = createDomainBodySchema.partial();

export const transferDomainBodySchema = z.object({
  newWorkspaceId: z
    .string({ required_error: "New workspace ID is required." })
    .min(1, "New workspace ID cannot be empty.")
    .transform((v) => v.replace("ws_", ""))
    .describe("The ID of the new workspace to transfer the domain to."),
});
