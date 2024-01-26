import { z } from "@hono/zod-openapi";

export const ProjectParamSchema = z.object({
  projectSlug: z.string().openapi({
    description:
      "The slug for the project that the link belongs to. E.g. for app.dub.co/acme, the projectSlug is 'acme'.",
  }),
});

export const ProjectSchema = z.object({
  id: z.string().openapi({ description: "The unique ID of the project." }),
  name: z.string().openapi({ description: "The name of the project." }),
  slug: z.string().openapi({ description: "The slug of the project." }),
  logo: z
    .string()
    .nullable()
    .openapi({ description: "The logo of the project." }),
  usage: z
    .number()
    .default(0)
    .openapi({ description: "The usage of the project." }),
  usageLimit: z
    .number()
    .default(0)
    .openapi({ description: "The usage limit of the project." }),
  plan: z
    .string()
    .default("free")
    .openapi({ description: "The plan of the project." }),
  stripeId: z
    .string()
    .nullable()
    .openapi({ description: "The Stripe ID of the project." }),
  billingCycleStart: z.number().nullable().openapi({
    description:
      "The date and time when the billing cycle starts for the project.",
  }),
  createdAt: z.string().openapi({
    description: "The date and time when the project was created.",
  }),
});
