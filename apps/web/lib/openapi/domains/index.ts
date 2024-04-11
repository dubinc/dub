import { ZodOpenApiPathsObject } from "zod-openapi";
import { addDomain } from "./add-domain";
import { listDomains } from "./list-domains";
import { deleteDomain } from "./delete-domain";

export const domainsPaths: ZodOpenApiPathsObject = {
  "/domains": {
    post: addDomain,
    get: listDomains,
  },
  "/domains/{slug}": {
    delete: deleteDomain,
  },
};
