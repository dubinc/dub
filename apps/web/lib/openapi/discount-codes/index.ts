import { ZodOpenApiPathsObject } from "zod-openapi";
import { listDiscountCodes } from "./list-discount-codes";

export const discountCodesPaths: ZodOpenApiPathsObject = {
  "/discount-codes": {
    get: listDiscountCodes,
  },
};
