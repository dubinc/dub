import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { getPlanCapabilities } from "../plan-capabilities";
import { CustomerProps } from "../types";
import { getCustomersQuerySchemaExtended } from "../zod/schemas/customers";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getCustomersQuerySchemaExtended.partial();

export default function useCustomers({
  query,
  enabled = true,
}: {
  query?: z.infer<typeof partialQuerySchema>;
  enabled?: boolean;
} = {}) {
  const { id: workspaceId, plan } = useWorkspace();
  const { canManageCustomers } = getPlanCapabilities(plan);

  const { data: customers, error } = useSWR<CustomerProps[]>(
    enabled && workspaceId && canManageCustomers
      ? `/api/customers?${new URLSearchParams({
          workspaceId: workspaceId,
          ...query,
        } as Record<string, any>).toString()}`
      : undefined,
    fetcher,
  );

  return {
    customers,
    loading: !customers && !error,
    error,
  };
}
