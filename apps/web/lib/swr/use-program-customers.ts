import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { z } from "zod";
import { CustomerProps } from "../types";
import { customersQuerySchema } from "../zod/schemas/customers";
import useWorkspace from "./use-workspace";

const partialQuerySchema = customersQuerySchema.partial();

export default function useProgramCustomers({
  query,
  enabled = true,
}: {
  query?: z.infer<typeof partialQuerySchema>;
  enabled?: boolean;
} = {}) {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();

  const { data, error } = useSWR<CustomerProps[]>(
    enabled && workspaceId
      ? `/api/programs/${programId}/customers?${new URLSearchParams({
          workspaceId: workspaceId,
          ...query,
        } as Record<string, any>).toString()}`
      : undefined,
    fetcher,
  );

  return {
    data,
    loading: !data && !error,
    error,
  };
}
