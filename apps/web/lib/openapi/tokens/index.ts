import { ZodOpenApiPathsObject } from "zod-openapi";
import { createEmbedToken } from "./create-embed-token";

export const tokensPaths: ZodOpenApiPathsObject = {
  "/tokens/embed": {
    post: createEmbedToken,
  },
};
