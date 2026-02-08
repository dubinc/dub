import { ZodOpenApiPathsObject } from "zod-openapi";
import { checkDomainStatus } from "./check-domain-status";
import { createDomain } from "./create-domain";
import { deleteDomain } from "./delete-domain";
import { listDomains } from "./list-domains";
import { registerDomain } from "./register-domain";
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
  "/domains/register": {
    post: registerDomain,
  },
  "/domains/status": {
    get: checkDomainStatus,
  },
};
