import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ProgramProps } from "../types";

export default function usePartnerPrograms() {
  const { partnerId } = useParams() as {
    partnerId?: string;
  };

  const { data: programs, isLoading } = useSWR<ProgramProps[]>(
    `/api/partners/${partnerId}/programs`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    programs,
    isLoading,
  };
}
