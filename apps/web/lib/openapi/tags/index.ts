import { ZodOpenApiPathsObject } from "zod-openapi";

import { createTag } from "./create-tag";
import { getTags } from "./get-tags";
import { updateTag } from "./update-tag";

export const tagsPaths: ZodOpenApiPathsObject = {
  "/tags": {
    post: createTag,
    get: getTags,
  },
  "/tags/{id}": {
    patch: updateTag,
  },
};
