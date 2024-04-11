import { getUrlQuerySchema } from "@/lib/zod/schemas";
import { ZodOpenApiOperationObject, ZodOpenApiPathsObject } from "zod-openapi";

const getMetatags: ZodOpenApiOperationObject = {
  operationId: "getMetatags",
  "x-speakeasy-name-override": "get",
  summary: "Retrieve the metatags for a URL",
  description: "Retrieve the metatags for a URL",
  requestParams: {
    query: getUrlQuerySchema,
  },
  responses: {
    "200": {
      description: "The retrieved metatags",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "The meta title tag for the URL",
              },
              description: {
                type: "string",
                description: "The meta description tag for the URL",
              },
              image: {
                type: "string",
                description: "The OpenGraph image for the URL",
              },
            },
          },
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
