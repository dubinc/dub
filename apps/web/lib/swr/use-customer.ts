import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { CustomerEnriched, CustomerProps } from "../types";
import { getCustomersQuerySchema } from "../zod/schemas/customers";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getCustomersQuerySchema.pick({
  includeExpandedFields: true,
});

export default function useCustomer<
  T extends CustomerProps | CustomerEnriched = CustomerProps,
>({
  customerId,
  query,
}: {
  customerId: T["id"];
  query?: z.infer<typeof partialQuerySchema>;
}) {
  const { id: workspaceId } = useWorkspace();

  const { data, error, isLoading } = useSWR<T>(
    workspaceId && customerId
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
