import { ZodOpenApiPathsObject } from "zod-openapi";
import { addDomain } from "./add-domain";
import { deleteDomain } from "./delete-domain";
import { listDomains } from "./list-domains";
import { setPrimaryDomain } from "./set-primary-domain";
import { transferDomain } from "./transfer-domain";
import { updateDomain } from "./update-domain";

export const domainsPaths: ZodOpenApiPathsObject = {
  "/domains": {
    post: addDomain,
    get: listDomains,
  },
  "/domains/{slug}": {
    patch: updateDomain,
    delete: deleteDomain,
  },
  "/domains/{slug}/primary": {
    post: setPrimaryDomain,
  },
  "/domains/{slug}/transfer": {
    post: transferDomain,
  },
};
