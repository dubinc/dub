import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { ProgramInviteProps } from "../types";

export default function usePartnerProgramInvites() {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];

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
