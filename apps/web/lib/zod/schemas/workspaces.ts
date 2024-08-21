import { isReservedKey } from "@/lib/edge-config";
import z from "@/lib/zod";
import {
  DEFAULT_REDIRECTS,
  validDomainRegex,
  validSlugRegex,
} from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { DomainSchema } from "./domains";
import { planSchema, roleSchema } from "./misc";

export const workspaceIdSchema = z.object({
  workspaceId: z
    .string()
    .min(1, "Workspace ID is required.")
    .describe("The ID of the workspace the link belongs to."),
});

export const WorkspaceSchema = z
  .object({
    id: z.string().describe("The unique ID of the workspace."),
    name: z.string().describe("The name of the workspace."),
    slug: z.string().describe("The slug of the workspace."),
    logo: z
      .string()
      .nullable()
      .default(null)
      .describe("The logo of the workspace."),
    usage: z.number().describe("The usage of the workspace."),
    usageLimit: z.number().describe("The usage limit of the workspace."),
    linksUsage: z.number().describe("The links usage of the workspace."),
    linksLimit: z.number().describe("The links limit of the workspace."),
    domainsLimit: z.number().describe("The domains limit of the workspace."),
    tagsLimit: z.number().describe("The tags limit of the workspace."),
    usersLimit: z.number().describe("The users limit of the workspace."),
    plan: planSchema,
    stripeId: z.string().nullable().describe("The Stripe ID of the workspace."),
    billingCycleStart: z
      .number()
      .describe(
        "The date and time when the billing cycle starts for the workspace.",
      ),
    stripeConnectId: z
      .string()
      .nullable()
      .describe("[BETA]: The Stripe Connect ID of the workspace."),
    createdAt: z
      .date()
      .describe("The date and time when the workspace was created."),
    users: z
      .array(
        z.object({
          role: roleSchema,
        }),
      )
      .describe("The role of the authenticated user in the workspace."),
    domains: z
      .array(
        DomainSchema.pick({
          slug: true,
          primary: true,
          verified: true,
        }),
      )
      .describe("The domains of the workspace."),
    inviteCode: z
      .string()
      .nullable()
      .describe("The invite code of the workspace."),
    conversionEnabled: z
      .boolean()
      .describe(
        "Whether the workspace has conversion tracking enabled (d.to/conversions).",
      ),
    flags: z
      .record(z.boolean())
      .optional()
      .describe(
        "The feature flags of the workspace, indicating which features are enabled.",
      ),
  })
  .openapi({
    title: "Workspace",
  });

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(32),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(48, "Slug must be less than 48 characters")
    .transform((v) => slugify(v))
    .refine((v) => validSlugRegex.test(v), { message: "Invalid slug format" })
    .refine(async (v) => !((await isReservedKey(v)) || DEFAULT_REDIRECTS[v]), {
      message: "Cannot use reserved slugs",
    }),
  domain: z
    .string()
    .refine((v) => validDomainRegex.test(v), {
      message: "Invalid domain format",
    })
    .optional(),
});

export const updateWorkspaceSchema = createWorkspaceSchema
  .pick({
    name: true,
    slug: true,
  })
  .partial();
