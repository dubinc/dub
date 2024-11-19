import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ProgramEnrollmentProps } from "../types";

export default function useProgramEnrollments() {
  const { partnerId } = useParams() as {
    partnerId?: string;
  };

  const { data: programEnrollments, isLoading } = useSWR<
    ProgramEnrollmentProps[]
  >(`/api/partners/${partnerId}/programs`, fetcher, {
    dedupingInterval: 60000,
  });

  return {
    programEnrollments,
    isLoading,
  };
}
