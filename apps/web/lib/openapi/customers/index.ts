import { ZodOpenApiPathsObject } from "zod-openapi";
import { createCustomer } from "./create-customer";
import { deleteCustomer } from "./delete-customer";
import { getCustomer } from "./get-customer";
import { getCustomers } from "./get-customers";
import { updateCustomer } from "./update-customer";

export const customersPaths: ZodOpenApiPathsObject = {
  "/customers": {
    get: getCustomers,
    post: createCustomer,
  },
  "/customers/{id}": {
    get: getCustomer,
    patch: updateCustomer,
    delete: deleteCustomer,
  },
};
