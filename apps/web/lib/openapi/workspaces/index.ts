import { ZodOpenApiPathsObject } from "zod-openapi";

import { getWorkspaceInfo } from "./get-workspace-info";
import { updateWorkspace } from "./update-workspace";

export const workspacesPaths: ZodOpenApiPathsObject = {
  "/workspaces/{idOrSlug}": {
    get: getWorkspaceInfo,
    patch: updateWorkspace,
  },
};
