import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { getCustomersCountQuerySchema } from "../zod/schemas/customers";
import useWorkspace from "./use-workspace";

export default function useCustomersCount<T = number>({
  query,
  enabled = true,
}: {
  query?: z.infer<typeof getCustomersCountQuerySchema>;
  enabled?: boolean;
} = {}) {
  const { id: workspaceId } = useWorkspace();

  const { data, error } = useSWR<T>(
    enabled &&
      workspaceId &&
      `/api/customers/count?${new URLSearchParams({ workspaceId, ...query })}`,
    fetcher,
  );

  return {
    data,
    error,
  };
}
