import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { AffiliateProps } from "../affiliates/types";
import useWorkspace from "./use-workspace";

export const useAffiliates = () => {
  const { id: workspaceId } = useWorkspace();

  const {
    data: affiliates,
    error,
    isLoading,
  } = useSWR<AffiliateProps[]>(
    workspaceId ? `/api/affiliates?workspaceId=${workspaceId}` : null,
    fetcher,
    {
      dedupingInterval: 20000,
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  return {
    affiliates,
    error,
    loading: isLoading,
  };
};
