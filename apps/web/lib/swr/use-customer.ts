import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { CustomerProps } from "../types";
import { clickEventSchema } from "../zod/schemas/clicks";
import { getCustomersQuerySchema } from "../zod/schemas/customers";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getCustomersQuerySchema.pick({
  includeExpandedFields: true,
});

export default function useCustomer<IncludeClickEvent extends boolean = false>({
  customerId,
  query,
  enabled = true,
  includeClickEvent,
}: {
  customerId: CustomerProps["id"];
  query?: z.infer<typeof partialQuerySchema>;
  enabled?: boolean;
  includeClickEvent?: IncludeClickEvent;
}) {
  const { id: workspaceId } = useWorkspace();

  const { data, error, isLoading } = useSWR<
    IncludeClickEvent extends true
      ? CustomerProps & { clickEvent: z.infer<typeof clickEventSchema> }
      : CustomerProps
  >(
    enabled && workspaceId
      ? `/api/customers/${customerId}?${new URLSearchParams({
          workspaceId: workspaceId,
          ...query,
          includeClickEvent,
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
