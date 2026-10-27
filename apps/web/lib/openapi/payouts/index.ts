import { ZodOpenApiPathsObject } from "zod-openapi";
import { listPayouts } from "./list-payouts";

export const payoutsPaths: ZodOpenApiPathsObject = {
  "/payouts": {
    get: listPayouts,
  },
};
