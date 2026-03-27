import { ZodOpenApiPathsObject } from "zod-openapi";
import { createGroup } from "./create-group";
import { getGroup } from "./get-group";
import { listGroups } from "./list-groups";

export const groupsPaths: ZodOpenApiPathsObject = {
  "/groups": {
    post: createGroup,
    get: listGroups,
  },
  "/groups/{groupId}": {
    get: getGroup,
  },
};
