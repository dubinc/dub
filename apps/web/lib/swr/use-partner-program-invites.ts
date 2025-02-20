import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { PartnerProgramInviteProps } from "../types";

export default function usePartnerProgramInvites() {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];

  const { data: programInvites } = useSWR<PartnerProgramInviteProps[]>(
    partnerId && `/api/partner-profile/programs/invites`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    programInvites,
  };
}
