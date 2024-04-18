import z from "@/lib/zod";
import { getUrlQuerySchema } from "@/lib/zod/schemas";
import { ZodOpenApiOperationObject, ZodOpenApiPathsObject } from "zod-openapi";

const getMetatags: ZodOpenApiOperationObject = {
  operationId: "getMetatags",
  "x-speakeasy-name-override": "get",
  summary: "Retrieve the metatags for a URL",
  description: "Retrieve the metatags for a URL.",
  requestParams: {
    query: getUrlQuerySchema.merge(
      z.object({
        url: z.string().openapi({
          example: "https://dub.co",
          description: "The URL to retrieve metatags for.",
        }),
      }),
    ),
  },
  responses: {
    "200": {
      description: "The retrieved metatags",
      content: {
        "application/json": {
          schema: z.object({
            title: z
              .string()
              .nullable()
              .describe("The meta title tag for the URL.")
              .openapi({
                example: "Dub.co - Link Management for Modern Marketing Teams",
              }),
            description: z
              .string()
              .nullable()
              .describe("The meta description tag for the URL.")
              .openapi({
                example:
                  "Dub.co is the open-source link management infrastructure ...",
              }),
            image: z
              .string()
              .nullable()
              .describe("The OpenGraph image for the URL.")
              .openapi({ example: "https://assets.dub.co/thumbnail.jpg" }),
          }),
        },
      },
    },
  },
  tags: ["Metatags"],
};

export const metatagsPath: ZodOpenApiPathsObject = {
  "/metatags": {
    get: getMetatags,
  },
};
