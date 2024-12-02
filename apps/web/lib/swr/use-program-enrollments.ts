import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ProgramEnrollmentProps } from "../types";

export default function useProgramEnrollments() {
  const { partnerId } = useParams();

  const { data: programEnrollments, isLoading } = useSWR<
    ProgramEnrollmentProps[]
  >(partnerId && `/api/partners/${partnerId}/programs`, fetcher, {
    dedupingInterval: 60000,
  });

  return {
    programEnrollments,
    isLoading,
  };
}
