import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { CustomerProps } from "../types";
import { getCustomersQuerySchema } from "../zod/schemas/customers";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getCustomersQuerySchema.pick({
  includeExpandedFields: true,
});

export default function useCustomer({
  customerId,
  query,
  enabled = true,
}: {
  customerId: CustomerProps["id"];
  query?: z.infer<typeof partialQuerySchema>;
  enabled?: boolean;
}) {
  const { id: workspaceId } = useWorkspace();

  const { data, error, isLoading } = useSWR<CustomerProps>(
    enabled && workspaceId
      ? `/api/customers/${customerId}?${new URLSearchParams({
          workspaceId: workspaceId,
          ...query,
        } as Record<string, any>).toString()}`
      : undefined,
    fetcher,
  );

  return {
    data,
    isLoading,
    error,
  };
}
