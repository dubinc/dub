import z from "@/lib/zod";
import { ProjectSchema } from "prisma/zod";
import { ZodOpenApiOperationObject, ZodOpenApiPathsObject } from "zod-openapi";

export const ProjectSchemaOpenApi = ProjectSchema.pick({
  id: true,
  name: true,
  slug: true,
  logo: true,
  usage: true,
  usageLimit: true,
  plan: true,
  stripeId: true,
  billingCycleStart: true,
  createdAt: true,
}).openapi({
  title: "Project",
  properties: {
    id: {
      description: "The unique ID of the project.",
    },
    name: {
      description: "The name of the project.",
    },
    slug: {
      description: "The slug of the project.",
    },
    logo: {
      description: "The logo of the project.",
    },
    usage: {
      description: "The usage of the project.",
    },
    usageLimit: {
      description: "The usage limit of the project.",
    },
    plan: {
      description: "The plan of the project.",
    },
    stripeId: {
      description: "The Stripe ID of the project.",
    },
    billingCycleStart: {
      description:
        "The date and time when the billing cycle starts for the project.",
    },
    createdAt: {
      description: "The date and time when the project was created.",
    },
  },
});

export type Project = z.infer<typeof ProjectSchemaOpenApi>;

export const getProjects: ZodOpenApiOperationObject = {
  operationId: "getProjects",
  summary: "Retrieve a list of projects",
  description: "Retrieve a list of projects for the authenticated user.",
  responses: {
    "200": {
      description: "The projects were retrieved",
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(ProjectSchemaOpenApi),
          }),
        },
      },
    },
  },
};

export const projectPaths: ZodOpenApiPathsObject = {
  "/projects": {
    get: getProjects,
  },
};
