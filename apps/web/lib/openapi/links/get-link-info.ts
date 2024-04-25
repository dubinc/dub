import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { domainKeySchema, LinkSchema } from "@/lib/zod/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const getLinkInfo: ZodOpenApiOperationObject = {
  operationId: "getLinkInfo",
  "x-speakeasy-name-override": "get",
  summary: "Retrieve a link",
  description:
    "Retrieve the info for a link. You can fetch the link by `domain` and `key`, `linkId`, or `externalId`.",
  requestParams: {
    query: workspaceParamsSchema.merge(domainKeySchema.partial()).merge(
      z.object({
        linkId: z
          .string()
          .optional()
          .describe("The unique ID of the short link."),
        externalId: z
          .string()
          .optional()
          .describe(
            "This is the ID of the link in the your database. Must be prefixed with `ext_`. when provided.",
          ),
      }),
    ),
  },
  responses: {
    "200": {
      description: "The retrieved link",
      content: {
        "application/json": {
          schema: LinkSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Links"],
  security: [{ token: [] }],
};
