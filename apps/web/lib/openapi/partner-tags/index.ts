import { ZodOpenApiPathsObject } from "zod-openapi";
import { createPartnerTag } from "./create-partner-tag";
import { deletePartnerTag } from "./delete-partner-tag";
import { listPartnerTags } from "./list-partner-tags";
import { updatePartnerTag } from "./update-partner-tag";

export const partnerTagsPaths: ZodOpenApiPathsObject = {
  "/partner-tags": {
    get: listPartnerTags,
    post: createPartnerTag,
  },
  "/partner-tags/{partnerTagId}": {
    patch: updatePartnerTag,
    delete: deletePartnerTag,
  },
};
