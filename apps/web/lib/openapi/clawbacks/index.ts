import { ZodOpenApiPathsObject } from "zod-openapi";
import { createClawback } from "./create-clawback";

export const clawbacksPaths: ZodOpenApiPathsObject = {
  "/clawbacks": {
    post: createClawback,
  },
};
