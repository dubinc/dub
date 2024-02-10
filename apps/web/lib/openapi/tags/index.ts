import { ZodOpenApiPathsObject } from "zod-openapi";

import { createTag } from "./create-tag";
import { getTags } from "./get-tags";

export const tagsPaths: ZodOpenApiPathsObject = {
  "/projects/{projectSlug}/tags": {
    post: createTag,
    get: getTags,
  },
};
