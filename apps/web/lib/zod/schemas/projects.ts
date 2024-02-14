import z from "@/lib/zod";
import { PlanSchema, RoleSchema } from ".";

export const projectSchema = z
  .object({
    id: z.string().describe("The unique ID of the project."),
    name: z.string().describe("The name of the project."),
    slug: z.string().describe("The slug of the project."),
    logo: z
      .string()
      .nullable()
      .default(null)
      .describe("The logo of the project."),
    usage: z.number().describe("The usage of the project."),
    usageLimit: z.number().describe("The usage limit of the project."),
    linksUsage: z.number().describe("The links usage of the project."),
    linksLimit: z.number().describe("The links limit of the project."),
    domainsLimit: z.number().describe("The domains limit of the project."),
    tagsLimit: z.number().describe("The tags limit of the project."),
    usersLimit: z.number().describe("The users limit of the project."),
    plan: PlanSchema,
    stripeId: z.string().nullable().describe("The Stripe ID of the project."),
    billingCycleStart: z
      .number()
      .describe(
        "The date and time when the billing cycle starts for the project.",
      ),
    createdAt: z
      .date()
      .describe("The date and time when the project was created."),
    users: z
      .array(
        z.object({
          role: RoleSchema,
        }),
      )
      .describe("The role of the authenticated user in the project."),
    domains: z
      .array(
        z.object({
          slug: z.string().describe("The domain of the project."),
        }),
      )
      .describe("The domains of the project."),
    metadata: z.object({
      defaultDomains: z.array(z.string()),
    }),
  })
  .openapi({
    title: "Project",
  });
