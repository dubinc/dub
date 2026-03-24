import { getCustomers } from "@/lib/customers/api/get-customers";
import { customersExportCronInputSchema } from "@/lib/zod/schemas/customers";
import * as z from "zod/v4";

type CustomersExportFilters = z.infer<typeof customersExportCronInputSchema>;

export async function* fetchCustomersBatch(
  filters: CustomersExportFilters,
  pageSize: number = 1000,
) {
  const { columns: _columns, ...filtersRest } = filters;

  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const customers = await getCustomers({
      ...filtersRest,
      pageSize,
      includeExpandedFields: true,
      ...(cursor
        ? { startingAfter: cursor }
        : { page: 1 }),
    });

    if (customers.length > 0) {
      yield { customers };
      cursor = customers[customers.length - 1].id;
      hasMore = customers.length === pageSize;
    } else {
      hasMore = false;
    }
  }
}
