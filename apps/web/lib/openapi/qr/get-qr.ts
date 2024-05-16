import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { getQRCodeQuerySchema } from "@/lib/zod/schemas/qr";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const getQRCode: ZodOpenApiOperationObject = {
  operationId: "getQRCode",
  "x-speakeasy-name-override": "get",
  summary: "Retrieve a QR code",
  description: "Retrieve a QR code for a link.",
  requestParams: {
    query: getQRCodeQuerySchema,
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
  tags: ["QR Codes"],
};
