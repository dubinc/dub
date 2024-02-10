import { ZodOpenApiOperationObject } from "zod-openapi";

import z from "@/lib/zod";
import { GetQRCodeQuerySchema } from "@/lib/zod/schemas/qr";

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
  },
  tags: ["Links"],
  security: [{ bearerToken: [] }],
};
