import { ZodOpenApiPathsObject } from "zod-openapi";

import { getQRCode } from "./get-qr";

export const qrCodePaths: ZodOpenApiPathsObject = {
  "/qr": {
    get: getQRCode,
  },
};
