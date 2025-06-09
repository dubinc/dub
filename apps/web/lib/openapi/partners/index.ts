import { ZodOpenApiPathsObject } from "zod-openapi";
import { createPartner } from "./create-partner";
import { createPartnerLink } from "./create-partner-link";
import { retrievePartnerAnalytics } from "./retrieve-analytics";
import { retrievePartnerLinks } from "./retrieve-partner-links";
import { upsertPartnerLink } from "./upsert-partner-link";

export const partnersPaths: ZodOpenApiPathsObject = {
  "/partners": {
    post: createPartner,
  },
  "/partners/links": {
    post: createPartnerLink,
    get: retrievePartnerLinks,
  },
  "/partners/links/upsert": {
    put: upsertPartnerLink,
  },
  "/partners/analytics": {
    get: retrievePartnerAnalytics,
  },
};
