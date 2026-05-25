import { ZodOpenApiPathsObject } from "zod-openapi";
import { bulkUpdateCommissions } from "./bulk-update-commissions";
import { createCommissions } from "./create-commissions";
import { listCommissions } from "./list-commissions";
import { updateCommission } from "./update-commission";

export const commissionsPaths: ZodOpenApiPathsObject = {
  "/commissions": {
    post: createCommissions,
    get: listCommissions,
  },
  "/commissions/{id}": {
    patch: updateCommission,
  },
  "/commissions/bulk": {
    patch: bulkUpdateCommissions,
  },
};
