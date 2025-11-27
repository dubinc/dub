import { z } from "zod";
import { DubApiError } from "../api/errors";
import { partnerIdTenantIdSchema } from "../zod/schemas/partners";

export function throwIfNoPartnerIdOrTenantId(
  payload: z.infer<typeof partnerIdTenantIdSchema>,
) {
  if (!payload.partnerId && !payload.tenantId) {
    throw new DubApiError({
      code: "bad_request",
      message: "Either `partnerId` or `tenantId` must be provided.",
    });
  }
}
