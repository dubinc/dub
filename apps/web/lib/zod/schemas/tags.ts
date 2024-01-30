import { z } from "@/lib/zod";
import { ZodOpenApiOperationObject, ZodOpenApiPathsObject } from "zod-openapi";

export const tagSchema = z
  .object({
    id: z.string().openapi({ description: "The unique ID of the tag." }),
    name: z.string().openapi({ description: "The name of the tag." }),
    color: z.string().openapi({ description: "The color of the tag." }),
  })
  .openapi({
    title: "Tag",
    description: "A tag schema",
  });

export const createTagSchema = z.object({
  tag: z.string().min(1).openapi({
    description: "The name of the tag to create.",
    example: "news",
  }),
});

export type Tag = z.infer<typeof tagSchema>;

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
        schema: createTagSchema,
      },
    },
  },
  responses: {
    "201": {
      description: "The tag was created",
      content: {
        "application/json": {
          schema: z.object({
            data: tagSchema,
          }),
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
          schema: z.object({
            data: z.array(tagSchema),
          }),
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
