import { getCustomers } from "@/lib/customers/api/get-customers";
import * as z from "zod/v4";
import { customersExportCronInputSchema } from "@/lib/zod/schemas/customers";

type CustomersExportFilters = z.infer<typeof customersExportCronInputSchema>;

export async function* fetchCustomersBatch(
  filters: CustomersExportFilters,
  pageSize: number = 1000,
) {
  const { columns: _columns, ...filtersRest } = filters;

  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const customers = await getCustomers({
      ...filtersRest,
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
