import { ZodOpenApiPathsObject } from "zod-openapi";

import { getWorkspaceInfo } from "./get-workspace-info";

export const workspacesPaths: ZodOpenApiPathsObject = {
  "/workspaces/{idOrSlug}": {
    get: getWorkspaceInfo,
  },
};
