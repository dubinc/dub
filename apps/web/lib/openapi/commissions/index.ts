import { ZodOpenApiPathsObject } from "zod-openapi";
import { bulkUpdateCommissions } from "./bulk-update-commissions";
import { createCommission } from "./create-commission";
import { listCommissions } from "./list-commissions";
import { updateCommission } from "./update-commission";

export const commissionsPaths: ZodOpenApiPathsObject = {
  "/commissions": {
    post: createCommission,
    get: listCommissions,
  },
  "/commissions/{id}": {
    patch: updateCommission,
  },
  "/commissions/bulk": {
    patch: bulkUpdateCommissions,
  },
};
