import { getCustomers } from "@/lib/customers/api/get-customers";
import * as z from "zod/v4";
import { customersExportQuerySchema } from "./schema";

type CustomersExportFilters = z.infer<typeof customersExportQuerySchema> & {
  programId: string;
};

export async function* fetchCustomersBatch(
  workspaceId: string,
  filters: CustomersExportFilters,
  pageSize: number = 1000,
) {
  const { programId, sortBy, sortOrder, columns: _columns, ...rest } = filters;

  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const customers = await getCustomers({
      workspaceId,
      programId,
      ...rest,
      sortBy,
      sortOrder,
      page,
      pageSize,
      includeExpandedFields: true,
    });

    if (customers.length > 0) {
      yield { customers };
      page++;
      hasMore = customers.length === pageSize;
    } else {
      hasMore = false;
    }
  }
}
