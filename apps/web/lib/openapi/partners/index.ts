import { ZodOpenApiPathsObject } from "zod-openapi";
import { approvePartner } from "./approve-partner";
import { banPartner } from "./ban-partner";
import { createPartner } from "./create-partner";
import { createPartnerLink } from "./create-partner-link";
import { deactivatePartner } from "./deactivate-partner";
import { listPartners } from "./list-partners";
import { rejectPartner } from "./reject-partner";
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
  "/partners/applications/approve": {
    post: approvePartner,
  },
  "/partners/applications/reject": {
    post: rejectPartner,
  },
  "/partners/ban": {
    post: banPartner,
  },
  "/partners/deactivate": {
    post: deactivatePartner,
  },
};
