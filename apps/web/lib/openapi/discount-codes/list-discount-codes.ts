import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  DiscountCodeSchema,
  getDiscountCodesQuerySchema,
} from "@/lib/zod/schemas/discount";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const listDiscountCodes: ZodOpenApiOperationObject = {
  operationId: "listDiscountCodes",
  "x-speakeasy-name-override": "list",
  summary: "Retrieve a list of discount codes",
  description:
    "Retrieve a list of discount codes for the authenticated workspace's default program.",
  requestParams: {
    query: getDiscountCodesQuerySchema,
  },
  responses: {
    "200": {
      description: "A list of discount codes",
      content: {
        "application/json": {
          schema: z.array(DiscountCodeSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Discount Codes"],
  security: [{ token: [] }],
};
