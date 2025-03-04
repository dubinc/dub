import { ZodOpenApiPathsObject } from "zod-openapi";
import { createReferralsEmbedToken } from "./create-embed-token";

export const tokensPaths: ZodOpenApiPathsObject = {
  "/tokens/embed": {
    post: createReferralsEmbedToken,
  },
};
