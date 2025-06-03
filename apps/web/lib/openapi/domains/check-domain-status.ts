import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import {
  DomainStatusSchema,
  searchDomainSchema,
} from "@/lib/zod/schemas/domains";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const checkDomainStatus: ZodOpenApiOperationObject = {
  operationId: "checkDomainStatus",
  "x-speakeasy-name-override": "checkStatus",
  summary: "Check a domain availability",
  description: "Check if a domain name is available for purchase.",
  requestParams: {
    query: searchDomainSchema,
  },
  responses: {
    "200": {
      description: "The domain status was retrieved.",
      content: {
        "application/json": {
          schema: z.array(DomainStatusSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Domains"],
  security: [{ token: [] }],
};
