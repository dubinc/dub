import { ZodOpenApiPathsObject } from "zod-openapi";

import { getWorkspaceInfo } from "./get-workspace-info";
import { getWorkspaces } from "./get-workspaces";

export const workspacesPaths: ZodOpenApiPathsObject = {
  "/workspaces": {
    get: getWorkspaces,
  },
  "/workspaces/{idOrSlug}": {
    get: getWorkspaceInfo,
  },
};
