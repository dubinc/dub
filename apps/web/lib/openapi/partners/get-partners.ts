import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import {
  EnrolledPartnerSchemaExtended,
  partnersQuerySchema,
} from "@/lib/zod/schemas/partners";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const getPartners: ZodOpenApiOperationObject = {
  operationId: "getPartners",
  "x-speakeasy-name-override": "list",
  summary: "Retrieve a list of partners",
  description: "Retrieve a list of partners for the program.",
  requestParams: {
    query: partnersQuerySchema,
  },
  responses: {
    "200": {
      description: "The list of partners.",
      content: {
        "application/json": {
          schema: z.array(EnrolledPartnerSchemaExtended),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Partners"],
  security: [{ token: [] }],
};
