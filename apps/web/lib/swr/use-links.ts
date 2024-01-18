import { fetcher } from "@dub/utils";
import { useRouterStuff } from "@dub/ui";
import { type Link as LinkProps } from "@prisma/client";
import useSWR from "swr";
import { UserProps } from "../types";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function useLinks() {
  const { slug } = useParams() as { slug?: string };
  const { getQueryString } = useRouterStuff();

  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (window.location.host.startsWith("admin.")) {
      setAdmin(true);
    }
  }, []);

  const { data: links, isValidating } = useSWR<
    (LinkProps & {
      user: UserProps;
    })[]
  >(
    slug
      ? `/api/links${getQueryString(
          { projectSlug: slug },
          {
            ignore: ["import", "upgrade"],
          },
        )}`
      : admin
      ? `/api/admin/links${getQueryString()}`
      : null,
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
