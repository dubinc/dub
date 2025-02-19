import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { PartnerLinkProps } from "../types";

export default function usePartnerLinks(opts?: { programId?: string }) {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];
  const { programSlug } = useParams();
  const programIdToUse = opts?.programId ?? programSlug;

  const { data: links, error } = useSWR<PartnerLinkProps[]>(
    programIdToUse &&
      partnerId &&
      `/api/partner-profile/programs/${programIdToUse}/links`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    links,
    error,
    loading: !links && !error,
  };
}
