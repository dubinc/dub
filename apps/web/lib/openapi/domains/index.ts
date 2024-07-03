import { ZodOpenApiPathsObject } from "zod-openapi";
import { createDomain } from "./create-domain";
import { deleteDomain } from "./delete-domain";
import { listDomains } from "./list-domains";
import { updateDomain } from "./update-domain";

export const domainsPaths: ZodOpenApiPathsObject = {
  "/domains": {
    post: createDomain,
    get: listDomains,
  },
  "/domains/{slug}": {
    patch: updateDomain,
    delete: deleteDomain,
  },
};
