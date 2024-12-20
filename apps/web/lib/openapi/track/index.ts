import { ZodOpenApiPathsObject } from "zod-openapi";
import { trackLead } from "./lead";
import { trackSale } from "./sale";

export const trackPaths: ZodOpenApiPathsObject = {
  "/track/lead": {
    post: trackLead,
  },
  "/track/sale": {
    post: trackSale,
  },
};
