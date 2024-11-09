import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { PartnerCounts } from "../types";
import useWorkspace from "./use-workspace";

export default function usePartnersCount() {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();

  const { data: partnersCount, error } = useSWR<PartnerCounts[]>(
    `/api/programs/${programId}/partners/count?workspaceId=${workspaceId}`,
    fetcher,
  );

  return {
    partnersCount,
    error,
  };
}
