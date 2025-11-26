import { ZodOpenApiPathsObject } from "zod-openapi";
import { banPartner } from "./ban-partner";
import { createPartner } from "./create-partner";
import { createPartnerLink } from "./create-partner-link";
import { listPartners } from "./list-partners";
import { retrievePartnerAnalytics } from "./retrieve-analytics";
import { retrievePartnerLinks } from "./retrieve-partner-links";
import { upsertPartnerLink } from "./upsert-partner-link";

export const partnersPaths: ZodOpenApiPathsObject = {
  "/partners": {
    post: createPartner,
    get: listPartners,
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
  "/partners/ban": {
    post: banPartner,
  },
};
