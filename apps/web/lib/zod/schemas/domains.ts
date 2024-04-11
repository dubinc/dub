import z from "@/lib/zod";

// TODO
// Add max and min

export const addDomainBodySchema = z.object({
  slug: z
    .string({ required_error: "Domain name is required" })
    .min(1)
    .max(50, "Domain name is too long. Max 50 characters long")
    .describe("Name of the domain."),
  target: z
    .string()
    .url("Target URL must be a valid URL.")
    .optional()
    .describe(
      "The page your users will get redirected to when they visit your domain.",
    ),
  type: z
    .enum(["redirect", "rewrite"])
    .optional()
    .default("redirect")
    .describe("The type of redirect to use for this domain."),
  expiredUrl: z
    .string()
    .url("Expired URL must be a valid URL")
    .optional()
    .describe(
      "Redirect users to a specific URL when any link under this domain has expired.",
    ),
  placeholder: z
    .string()
    .url("Placeholder URL must be a valid URL")
    .optional()
    .describe(
      "Provide context to your teammates in the link creation modal by showing them an example of a link to be shortened.",
    ),
});

export const DomainSchema = z
  .object({
    slug: z
      .string()
      .describe("The domain name.")
      .openapi({ example: "acme.com" }),
    verified: z.boolean().describe("Whether the domain is verified."),
    primary: z
      .boolean()
      .describe("Whether the domain is the primary domain for the workspace."),
    archived: z
      .boolean()
      .describe("Whether the domain is archived.")
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
      .nullable()
      .describe(
        "The URL to redirect to when a link under this domain has expired.",
      )
      .openapi({ example: "https://acme.com/expired" }),
    target: z
      .string()
      .nullable()
      .describe(
        "The page your users will get redirected to when they visit your domain.",
      )
      .openapi({ example: "https://acme.com/landing" }),
    type: z
      .string()
      .describe("The type of redirect to use for this domain.")
      .openapi({ enum: ["redirect", "rewrite"] }),
    clicks: z
      .number()
      .describe("The number of clicks on the domain.")
      .default(0),
  })
  .strict();

export type Domain = z.infer<typeof DomainSchema>;
