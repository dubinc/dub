import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { ProgramInviteProps } from "../types";

export default function usePartnerProgramInvites() {
  const partnerId = "pn_DlsZeePb38RVcnrfbD0SrKzB";

  const { data: programInvites } = useSWR<ProgramInviteProps[]>(
    partnerId && `/api/partners/${partnerId}/programs/invites`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    programInvites,
  };
}
