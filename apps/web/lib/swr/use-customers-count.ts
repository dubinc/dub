import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { getCustomersCountQuerySchema } from "../zod/schemas/customers";
import useWorkspace from "./use-workspace";

export default function useCustomersCount<T = number>({
  query,
}: {
  query?: z.infer<typeof getCustomersCountQuerySchema>;
} = {}) {
  const { id: workspaceId } = useWorkspace();

  const { data, error } = useSWR<T>(
    workspaceId &&
      `/api/customers/count?${new URLSearchParams({ workspaceId, ...query })}`,
    fetcher,
  );

  return {
    data,
    error,
  };
}
