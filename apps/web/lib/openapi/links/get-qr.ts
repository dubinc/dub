import { ZodOpenApiOperationObject } from "zod-openapi";

import z from "@/lib/zod";
import { GetQRCodeQuerySchema } from "@/lib/zod/schemas/qr";
import { openApiErrorResponses } from "@/lib/openapi/responses";

export const getQRCode: ZodOpenApiOperationObject = {
  operationId: "getQRCode",
  summary: "Retrieve a QR code",
  description: "Retrieve a QR code for a link.",
  requestParams: {
    query: GetQRCodeQuerySchema,
  },
  responses: {
    "200": {
      description: "The QR code",
      content: {
        "image/png": {
          schema: z.string(),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Links"],
  security: [{ bearerToken: [] }],
};
