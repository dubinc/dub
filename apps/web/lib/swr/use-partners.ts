import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { z } from "zod";
import { EnrolledPartnerProps } from "../types";
import { partnersQuerySchema } from "../zod/schemas/partners";
import useWorkspace from "./use-workspace";

const partialQuerySchema = partnersQuerySchema.partial();

export default function usePartners({
  query,
  enabled = true,
}: {
  query?: z.infer<typeof partialQuerySchema>;
  enabled?: boolean;
} = {}) {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();

  const { data, error } = useSWR<EnrolledPartnerProps[]>(
    enabled && workspaceId
      ? `/api/partners?${new URLSearchParams({
          workspaceId: workspaceId,
          programId: programId,
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
