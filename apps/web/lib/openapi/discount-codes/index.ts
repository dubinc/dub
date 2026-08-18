import { ZodOpenApiPathsObject } from "zod-openapi";
import { createDiscountCode } from "./create-discount-code";
import { deleteDiscountCode } from "./delete-discount-code";
import { listDiscountCodes } from "./list-discount-codes";
import { updateDiscountCode } from "./update-discount-code";

export const discountCodesPaths: ZodOpenApiPathsObject = {
  "/discount-codes": {
    get: listDiscountCodes,
    post: createDiscountCode,
  },
  "/discount-codes/{id}": {
    patch: updateDiscountCode,
    delete: deleteDiscountCode,
  },
};
