import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ProgramEnrollmentProps } from "../types";

export default function useProgramEnrollment() {
  const { partnerId, programSlug } = useParams();

  const { data: programEnrollment, error } = useSWR<ProgramEnrollmentProps>(
    `/api/partners/${partnerId}/programs/${programSlug}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    programEnrollment,
    error,
    loading:
      partnerId && !programEnrollment && !error ? true : false,
  };
}
