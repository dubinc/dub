import { ZodOpenApiOperationObject } from "zod-openapi";
import { updatePartnerSaleSchema } from "../../zod/schemas/partners";
import { ProgramSaleSchema } from "../../zod/schemas/program-sales";
import { openApiErrorResponses } from "../responses";

export const updateSale: ZodOpenApiOperationObject = {
  operationId: "updateSale",
  "x-speakeasy-name-override": "updateSale",
  summary: "Update an existing sale.",
  description:
    "This is useful if you need to change the amount of a sale after it has been created.",
  requestBody: {
    content: {
      "application/json": {
        schema: updatePartnerSaleSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The updated sale.",
      content: {
        "application/json": {
          schema: ProgramSaleSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Partners"],
  security: [{ token: [] }],
};
