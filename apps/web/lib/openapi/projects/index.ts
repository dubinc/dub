import { ZodOpenApiPathsObject } from "zod-openapi";

import { getProjects } from "./get-projects";
import { getProjectInfo } from "./get-project-info";

export const projectsPaths: ZodOpenApiPathsObject = {
  "/projects": {
    get: getProjects,
  },
  "/projects/{projectSlug}": {
    get: getProjectInfo,
  },
};
