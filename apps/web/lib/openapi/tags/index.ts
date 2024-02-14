import { ZodOpenApiPathsObject } from "zod-openapi";

import { createTag } from "./create-tag";
import { getTags } from "./get-tags";

export const tagsPaths: ZodOpenApiPathsObject = {
  "/tags": {
    post: createTag,
    get: getTags,
  },
};
