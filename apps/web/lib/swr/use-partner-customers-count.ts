import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import * as z from "zod/v4";
import { getPartnerCustomersCountQuerySchema } from "../zod/schemas/partner-profile";

export default function usePartnerCustomersCount<T = number>({
  query,
  enabled = true,
}: {
  query?: z.infer<typeof getPartnerCustomersCountQuerySchema>;
  enabled?: boolean;
} = {}) {
  const { programSlug } = useParams<{ programSlug: string }>();
  const { getQueryString } = useRouterStuff();

  const { data, error } = useSWR<T>(
    enabled &&
      `/api/partner-profile/programs/${programSlug}/customers/count${getQueryString(
        query,
        {
          include: ["country", "linkId", "search"],
        },
      )}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    data,
    error,
  };
}
