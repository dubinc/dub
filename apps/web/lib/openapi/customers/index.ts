import { ZodOpenApiPathsObject } from "zod-openapi";
import { createCustomer } from "./create-customer";
import { deleteCustomer } from "./delete-customer";
import { updateCustomer } from "./update-customer";

export const customersPaths: ZodOpenApiPathsObject = {
  "/customers": {
    post: createCustomer,
  },
  "/customers/{id}": {
    patch: updateCustomer,
    delete: deleteCustomer,
  },
};
