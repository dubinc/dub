import { ZodOpenApiPathsObject } from "zod-openapi";
import { deleteCustomer } from "./delete-customer";
import { getCustomer } from "./get-customer";
import { getCustomers } from "./get-customers";
import { updateCustomer } from "./update-customer";

export const customersPaths: ZodOpenApiPathsObject = {
  "/customers": {
    get: getCustomers,
  },
  "/customers/{id}": {
    get: getCustomer,
    patch: updateCustomer,
    delete: deleteCustomer,
  },
};
