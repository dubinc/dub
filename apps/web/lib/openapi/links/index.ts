import { ZodOpenApiPathsObject } from "zod-openapi";

import { getLinks } from "./get-links";
import { createLink } from "./create-link";
import { getLinkInfo } from "./get-link-info";
import { deleteLink } from "./delete-link";
import { editLink } from "./edit-link";
import { createBulkLink } from "./create-bulk-link";
import { getQRCode } from "./get-qr";

export const linksPaths: ZodOpenApiPathsObject = {
  "/links": {
    post: createLink,
    get: getLinks,
  },
  "/links/info": {
    get: getLinkInfo,
  },
  "/links/{linkId}": {
    put: editLink,
    delete: deleteLink,
  },
  "/links/bulk": {
    post: createBulkLink,
  },
  "/qr": {
    get: getQRCode,
  },
};
