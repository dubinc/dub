import { ZodOpenApiPathsObject } from "zod-openapi";
import { listCommissions } from "./list-commissions";
import { updateCommission } from "./update-commission";

export const commissionsPaths: ZodOpenApiPathsObject = {
  "/commissions": {
    get: listCommissions,
  },
  "/commissions/{id}": {
    patch: updateCommission,
  },
};
