import { ZodOpenApiPathsObject } from "zod-openapi";
import { trackLead } from "./lead";
import { trackOpen } from "./open";
import { trackSale } from "./sale";

export const trackPaths: ZodOpenApiPathsObject = {
  "/track/lead": {
    post: trackLead,
  },
  "/track/sale": {
    post: trackSale,
  },
  "/track/open": {
    post: trackOpen,
  },
};
