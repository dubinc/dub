import { fetcher } from "@dub/utils";
import { useRouterStuff } from "@dub/ui";
import { type Link as LinkProps } from "@prisma/client";
import useSWR from "swr";
import { UserProps } from "../types";
import { useParams } from "next/navigation";

export default function useLinks() {
  const { slug } = useParams() as { slug?: string };
  const { getQueryString } = useRouterStuff();

  const { data: links, isValidating } = useSWR<
    (LinkProps & {
      user: UserProps;
    })[]
  >(
    `/api/links${getQueryString(slug ? { projectSlug: slug } : undefined)}`,
    fetcher,
    {
      dedupingInterval: 20000,
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  return {
    links,
    isValidating,
  };
}
