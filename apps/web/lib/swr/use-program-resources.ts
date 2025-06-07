import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { z } from "zod";
import { programResourcesSchema } from "../zod/schemas/program-resources";
import useWorkspace from "./use-workspace";

export type ProgramResourcesProps = z.infer<typeof programResourcesSchema>;

export default function useProgramResources() {
  const { programSlug } = useParams();
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const endpoint = programSlug
    ? `/api/partner-profile/programs/${programSlug}/resources`
    : defaultProgramId
      ? `/api/programs/${defaultProgramId}/resources?workspaceId=${workspaceId}`
      : null;

  const {
    data: resources,
    error,
    isValidating,
    mutate,
  } = useSWR<ProgramResourcesProps>(endpoint, fetcher, {
    dedupingInterval: 60000,
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  return {
    resources,
    error,
    mutate,
    isValidating,
    isLoading: Boolean(!resources && !error),
  };
}
