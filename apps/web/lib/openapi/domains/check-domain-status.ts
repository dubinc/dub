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
  summary: "Check the availability of one or more domains",
  description:
    "Check if a domain name is available for purchase. You can check multiple domains at once.",
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
