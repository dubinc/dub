import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { PartnerRole } from "@dub/prisma/client";

export type PartnerUserProps = {
  id: string | null; // null for invites
  name: string | null;
  email: string;
  role: PartnerRole;
  image: string | null;
  createdAt?: Date; // for invites
};

export default function usePartnerProfileUsers() {
  const { data: users, error, isLoading, mutate } = useSWR<PartnerUserProps[]>(
    "/api/partner-profile/users",
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    users,
    loading: isLoading,
    error,
    mutate,
  };
}
