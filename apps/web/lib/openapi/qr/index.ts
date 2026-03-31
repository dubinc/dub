import { ZodOpenApiOperationObject, ZodOpenApiPathsObject } from "zod-openapi";

import { getQRCodeQuerySchema } from "@/lib/zod/schemas/qr";
import * as z from "zod/v4";
import { openApiErrorResponses } from "../responses";

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

export const qrCodePaths: ZodOpenApiPathsObject = {
  "/qr": {
    get: getQRCode,
  },
};
