import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ProgramEnrollmentProps } from "../types";

export default function useProgramEnrollment() {
  const { partnerId, programId } = useParams();

  const { data: programEnrollment, error } = useSWR<ProgramEnrollmentProps>(
    `/api/partners/${partnerId}/programs/${programId}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );
  programEnrollment;
  return {
    programEnrollment,
    error,
    loading: partnerId && !programEnrollment && !error ? true : false,
  };
}
