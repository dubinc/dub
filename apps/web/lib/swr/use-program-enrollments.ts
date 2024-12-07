import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { ProgramEnrollmentProps } from "../types";

export default function useProgramEnrollments() {
  const partnerId = "pn_DlsZeePb38RVcnrfbD0SrKzB";

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
