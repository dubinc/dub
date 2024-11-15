import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ProgramInviteProps } from "../types";

export default function usePartnerProgramInvites() {
  const { partnerId } = useParams() as {
    partnerId?: string;
  };

  const { data: invites } = useSWR<ProgramInviteProps[]>(
    `/api/partners/${partnerId}/programs/invites`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    invites,
  };
}
