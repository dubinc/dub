import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { CustomerProps } from "../types";
import { customersQuerySchema } from "../zod/schemas/customers";
import useWorkspace from "./use-workspace";

const partialQuerySchema = customersQuerySchema.partial();

export default function useCustomers({
  query,
  enabled = true,
}: {
  query?: z.infer<typeof partialQuerySchema>;
  enabled?: boolean;
} = {}) {
  const { id: workspaceId } = useWorkspace();

  const { data: customers, error } = useSWR<CustomerProps[]>(
    enabled && workspaceId
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
