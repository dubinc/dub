import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ProgramEnrollmentProps } from "../types";

export default function useProgramEnrollment() {
  const { partnerId, programSlug } = useParams();

  const { data: programEnrollment, error } = useSWR<ProgramEnrollmentProps>(
    partnerId && programSlug
      ? `/api/partners/${partnerId}/programs/${programSlug}`
      : undefined,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    programEnrollment,
    error,
    loading: partnerId && !programEnrollment && !error ? true : false,
  };
}
