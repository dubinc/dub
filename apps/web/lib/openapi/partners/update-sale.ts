import { openApiErrorResponses } from "@/lib/openapi/responses";
import { updateSaleSchema } from "@/lib/zod/schemas/partners";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { SaleSchema } from "../../zod/schemas/partners";

export const updateSale: ZodOpenApiOperationObject = {
  operationId: "updateSale",
  "x-speakeasy-name-override": "updateSale",
  summary: "Update an existing sale.",
  description:
    "This is useful if you need to change the amount of a sale after it has been created.",
  requestBody: {
    content: {
      "application/json": {
        schema: updateSaleSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The updated sale.",
      content: {
        "application/json": {
          schema: SaleSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Partners"],
  security: [{ token: [] }],
};
