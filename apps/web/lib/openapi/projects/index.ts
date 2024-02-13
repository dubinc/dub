import { ZodOpenApiPathsObject } from "zod-openapi";

import { getProjectInfo } from "./get-project-info";
import { getProjects } from "./get-projects";

export const projectsPaths: ZodOpenApiPathsObject = {
  "/projects": {
    get: getProjects,
  },
  "/projects/{projectSlug}": {
    get: getProjectInfo,
  },
};
