import { PartnerRole } from "@dub/prisma/client";
import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { z } from "zod";
import { getPartnerUsersQuerySchema } from "../zod/schemas/partner-profile";

export type PartnerUserProps = {
  id: string | null; // null for invites
  name: string | null;
  email: string;
  role: PartnerRole;
  image: string | null;
  createdAt?: Date; // for invites
};

const partialQuerySchema = getPartnerUsersQuerySchema.partial();

export default function usePartnerProfileUsers({
  query,
}: {
  query?: z.infer<typeof partialQuerySchema>;
} = {}) {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];

  const {
    data: users,
    error,
    isLoading,
    mutate,
  } = useSWR<PartnerUserProps[]>(
    partnerId
      ? `/api/partner-profile/users?${new URLSearchParams({
          ...query,
        } as Record<string, any>).toString()}`
      : null,
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
