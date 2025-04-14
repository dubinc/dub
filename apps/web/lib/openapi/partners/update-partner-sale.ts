import { ZodOpenApiOperationObject } from "zod-openapi";
import { CommissionSchema } from "../../zod/schemas/commissions";
import { updatePartnerSaleSchema } from "../../zod/schemas/partners";
import { openApiErrorResponses } from "../responses";

export const updatePartnerSale: ZodOpenApiOperationObject = {
  operationId: "updatePartnerSale",
  "x-speakeasy-name-override": "updateSale",
  summary: "Update a sale for a partner.",
  description:
    "Update an existing sale amount. This is useful for handling refunds (partial or full) or fraudulent sales.",
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
          schema: CommissionSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Partners"],
  security: [{ token: [] }],
};
