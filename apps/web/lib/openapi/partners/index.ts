import { ZodOpenApiPathsObject } from "zod-openapi";
import { createPartner } from "./create-partner";
import { createPartnerLink } from "./create-partner-link";
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
};
