import { ZodOpenApiPathsObject } from "zod-openapi";
import { createReferralsEmbedToken } from "./create-referrals-embed-token";

export const embedTokensPaths: ZodOpenApiPathsObject = {
  "/tokens/embed/referrals": {
    post: createReferralsEmbedToken,
  },
};
