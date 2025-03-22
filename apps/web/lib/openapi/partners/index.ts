import { ZodOpenApiPathsObject } from "zod-openapi";
import { createPartner } from "./create-partner";
import { createPartnerLink } from "./create-partner-link";
import { retrievePartnerAnalytics } from "./retrieve-analytics";
import { updatePartnerSale } from "./update-partner-sale";
import { upsertPartnerLink } from "./upsert-partner-link";

export const partnersPaths: ZodOpenApiPathsObject = {
  "/partners": {
    post: createPartner,
  },
  "/partners/links": {
    post: createPartnerLink,
  },
  "/partners/links/upsert": {
    put: upsertPartnerLink,
  },
  "/partners/analytics": {
    get: retrievePartnerAnalytics,
  },
  "/partners/sales": {
    patch: updatePartnerSale,
  },
};
