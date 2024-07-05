import { ZodOpenApiPathsObject } from "zod-openapi";

import { bulkCreateLinks } from "./bulk-create-links";
import { bulkUpdateLinks } from "./bulk-update-links";
import { createLink } from "./create-link";
import { deleteLink } from "./delete-link";
import { getLinkInfo } from "./get-link-info";
import { getLinks } from "./get-links";
import { getLinksCount } from "./get-links-count";
import { updateLink } from "./update-link";
import { upsertLink } from "./upsert-link";

export const linksPaths: ZodOpenApiPathsObject = {
  "/links": {
    post: createLink,
    get: getLinks,
  },
  "/links/count": {
    get: getLinksCount,
  },
  "/links/info": {
    get: getLinkInfo,
  },
  "/links/{linkId}": {
    patch: updateLink,
    delete: deleteLink,
  },
  "/links/bulk": {
    post: bulkCreateLinks,
    patch: bulkUpdateLinks,
  },
  "/links/upsert": {
    put: upsertLink,
  },
};
