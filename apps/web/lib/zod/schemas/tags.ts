import z from "@/lib/zod";
import { TagSchema } from "prisma/zod";
import { ZodOpenApiOperationObject, ZodOpenApiPathsObject } from "zod-openapi";

export const TagSchemaOpenApi = TagSchema.pick({
  id: true,
  name: true,
  color: true,
}).openapi({
  title: "Tag",
  properties: {
    id: {
      description: "The unique ID of the tag.",
    },
    name: {
      description: "The name of the tag.",
    },
    color: {
      description: "The color of the tag.",
    },
  },
});

export const CreateTagSchema = z.object({
  tag: z.string().min(1).openapi({
    description: "The name of the tag to create.",
    example: "news",
  }),
});

export type Tag = z.infer<typeof TagSchemaOpenApi>;

export const createTag: ZodOpenApiOperationObject = {
  operationId: "createTag",
  summary: "Create a new tag",
  description: "Create a new tag for the authenticated project.",
  requestParams: {
    path: z.object({
      projectSlug: z.string().min(1).openapi({
        description:
          "The slug for the project to retrieve tags for. E.g. for `app.dub.co/acme`, the `projectSlug` is `acme`.",
        example: "acme",
      }),
    }),
  },
  requestBody: {
    content: {
      "application/json": {
        schema: CreateTagSchema,
      },
    },
  },
  responses: {
    "201": {
      description: "The tag was created",
      content: {
        "application/json": {
          schema: TagSchemaOpenApi,
        },
      },
    },
  },
};

export const getTags: ZodOpenApiOperationObject = {
  operationId: "getTags",
  summary: "Retrieve a list of tags",
  description: "Retrieve a list of tags for the authenticated project.",
  requestParams: {
    path: z.object({
      projectSlug: z.string().min(1).openapi({
        description:
          "The slug for the project to retrieve tags for. E.g. for `app.dub.co/acme`, the `projectSlug` is `acme`.",
        example: "acme",
      }),
    }),
  },
  responses: {
    "200": {
      description: "The tags were found",
      content: {
        "application/json": {
          schema: z.array(TagSchemaOpenApi),
        },
      },
    },
  },
};

export const tagPaths: ZodOpenApiPathsObject = {
  "/projects/{projectSlug}/tags": {
    post: createTag,
    get: getTags,
  },
};
