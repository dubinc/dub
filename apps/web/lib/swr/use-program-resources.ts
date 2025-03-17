import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { programResourcesSchema } from "../zod/schemas/program-resources";

export type ProgramResourcesProps = z.infer<typeof programResourcesSchema>;

export default function useProgramResources(
  props: { workspaceId: string; programId: string } | { programId: string },
) {
  const endpoint =
    props.programId &&
    ("workspaceId" in props
      ? props.workspaceId
        ? `/api/programs/${props.programId}/resources?workspaceId=${props.workspaceId}`
        : null
      : `/api/partner-profile/programs/${props.programId}/resources`);

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
    isLoading: Boolean(props.programId && !resources && !error),
  };
}
