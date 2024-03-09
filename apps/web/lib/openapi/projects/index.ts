import { ZodOpenApiPathsObject } from "zod-openapi";

import { getProjectInfo } from "./get-project-info";
import { getProjects } from "./get-projects";

export const projectsPaths: ZodOpenApiPathsObject = {
  "/workspaces": {
    get: getProjects,
  },
  "/workspaces/{workspaceId}": {
    get: getProjectInfo,
  },
};
