import { useRouter } from "next/router";
import useSWR from "swr";
import { type Link as LinkProps } from "@prisma/client";
import { fetcher, getQueryString } from "#/lib/utils";
import { UserProps } from "../types";

export default function useLinks() {
  const router = useRouter();

  const { data: links, isValidating } = useSWR<
    (LinkProps & {
      user: UserProps;
    })[]
  >(router.isReady && `/api/links${getQueryString(router)}`, fetcher, {
    // disable this because it keeps refreshing the state of the modal when its open
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  return {
    links,
    loading: links ? false : true,
    isValidating,
  };
}
