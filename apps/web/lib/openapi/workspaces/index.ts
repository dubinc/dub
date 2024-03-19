import { ZodOpenApiPathsObject } from "zod-openapi";

import { createWorkspace } from "./create-workspace";
import { getWorkspaceInfo } from "./get-workspace-info";
import { getWorkspaces } from "./get-workspaces";

export const workspacesPaths: ZodOpenApiPathsObject = {
  "/workspaces": {
    get: getWorkspaces,
    post: createWorkspace,
  },
  "/workspaces/{idOrSlug}": {
    get: getWorkspaceInfo,
  },
};
