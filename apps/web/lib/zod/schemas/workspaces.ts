import z from "@/lib/zod";
import { DEFAULT_REDIRECTS, RESERVED_SLUGS, validSlugRegex } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { DomainSchema } from "./domains";
import { planSchema, roleSchema, uploadedImageSchema } from "./misc";

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
    inviteCode: z
      .string()
      .nullable()
      .describe("The invite code of the workspace."),

    plan: planSchema,
    stripeId: z.string().nullable().describe("The Stripe ID of the workspace."),
    billingCycleStart: z
      .number()
      .describe(
        "The date and time when the billing cycle starts for the workspace.",
      ),
    paymentFailedAt: z
      .date()
      .nullable()
      .describe("The date and time when the payment failed for the workspace."),
    stripeConnectId: z
      .string()
      .nullable()
      .describe("The Stripe Connect ID of the workspace."),
    totalLinks: z
      .number()
      .describe("The total number of links in the workspace."),
    usage: z.number().describe("The usage of the workspace."),
    usageLimit: z.number().describe("The usage limit of the workspace."),
    linksUsage: z.number().describe("The links usage of the workspace."),
    linksLimit: z.number().describe("The links limit of the workspace."),
    payoutsUsage: z
      .number()
      .describe(
        "The dollar amount of partner payouts processed in the current billing cycle (in cents).",
      ),
    payoutsLimit: z
      .number()
      .describe(
        "The max dollar amount of partner payouts that can be processed within a billing cycle (in cents).",
      ),
    payoutFee: z
      .number()
      .describe(
        "The processing fee (in decimals) for partner payouts. For card payments, an additional 0.03 is added to the fee. Learn more: https://d.to/payouts",
      ),
    domainsLimit: z.number().describe("The domains limit of the workspace."),
    tagsLimit: z.number().describe("The tags limit of the workspace."),
    foldersUsage: z.number().describe("The folders usage of the workspace."),
    foldersLimit: z.number().describe("The folders limit of the workspace."),
    usersLimit: z.number().describe("The users limit of the workspace."),
    aiUsage: z.number().describe("The AI usage of the workspace."),
    aiLimit: z.number().describe("The AI limit of the workspace."),

    conversionEnabled: z
      .boolean()
      .describe(
        "Whether the workspace has conversion tracking enabled automatically for new links (d.to/conversions).",
      ),
    dotLinkClaimed: z
      .boolean()
      .describe(
        "Whether the workspace has claimed a free .link domain. (dub.link/free)",
      ),
    partnersEnabled: z
      .boolean()
      .describe("Whether the workspace has Dub Partners enabled."),

    createdAt: z
      .date()
      .describe("The date and time when the workspace was created."),
    users: z
      .array(
        z.object({
          role: roleSchema,
          defaultFolderId: z
            .string()
            .nullable()
            .describe(
              "The ID of the default folder for the user in the workspace.",
            ),
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
    flags: z
      .record(z.boolean())
      .optional()
      .describe(
        "The feature flags of the workspace, indicating which features are enabled.",
      ),
    store: z
      .record(z.any())
      .nullable()
      .describe("The miscellaneous key-value store of the workspace."),
    allowedHostnames: z
      .array(z.string())
      .nullable()
      .describe("Specifies hostnames permitted for client-side click tracking.")
      .openapi({ example: ["dub.sh"] }),
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
    .refine(
      async (v) => !(RESERVED_SLUGS.includes(v) || DEFAULT_REDIRECTS[v]),
      {
        message: "Cannot use reserved slugs",
      },
    ),
  logo: uploadedImageSchema.nullish(),
  conversionEnabled: z.boolean().optional(),
});

export const updateWorkspaceSchema = createWorkspaceSchema.partial().extend({
  allowedHostnames: z.array(z.string()).optional(),
});

export const notificationTypes = z.enum([
  "linkUsageSummary",
  "domainConfigurationUpdates",
  "newPartnerSale",
  "newPartnerApplication",
]);

export const WorkspaceSchemaExtended = WorkspaceSchema.extend({
  defaultProgramId: z.string().nullable(),
  users: z.array(
    WorkspaceSchema.shape.users.element.extend({
      workspacePreferences: z.record(z.any()).nullish(),
    }),
  ),
});

export const OnboardingUsageSchema = z.object({
  links: z.number(),
  clicks: z.number(),
  conversions: z.boolean(),
  partners: z.boolean(),
});

export const workspaceStoreKeys = z.enum([
  "onboardingUsage", // json
  "programOnboarding", // json
  "conversionsOnboarding", // boolean
  "dubPartnersPopupDismissed", // boolean
  "dotLinkOfferDismissed", // string
]);
