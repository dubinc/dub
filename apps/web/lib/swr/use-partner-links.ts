import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { PartnerProfileLinkProps } from "../types";
import { PartnerLinkExpandField } from "../zod/schemas/partners";

export function usePartnerLinks(opts?: {
  programId?: string;
  expand?: PartnerLinkExpandField[];
}) {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];
  const { programSlug } = useParams();
  const programIdToUse = opts?.programId ?? programSlug;

  const expandQuery =
    opts?.expand && opts.expand.length > 0
      ? `?${opts.expand.map((field) => `expand[]=${field}`).join("&")}`
      : "";

  const {
    data: links,
    error,
    isValidating,
  } = useSWR<PartnerProfileLinkProps[]>(
    programIdToUse &&
      partnerId &&
      `/api/partner-profile/programs/${programIdToUse}/links${expandQuery}`,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

  return {
    links,
    error,
    loading: !links && !error,
    isValidating,
  };
}
