"use client";

import { fetcher } from "@dub/utils";
import { useEffect } from "react";
import useSWR from "swr";
import { useEmbedToken } from "../../embed/use-embed-token";

export const ReferralsReferralsEmbedToken = () => {
  const token = useEmbedToken();

  const { error } = useSWR<{ token: number }>(
    "/api/embed/referrals/token",
    (url) =>
      fetcher(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    {
      revalidateOnFocus: true,
      dedupingInterval: 30000,
      keepPreviousData: true,
    },
  );

  // Inform the parent if there's an error (Eg: token is expired)
  useEffect(() => {
    if (error) {
      window.parent.postMessage(
        {
          originator: "Dub",
          event: "ERROR",
          data: error.info,
        },
        "*",
      );
    }
  }, [error]);

  return null;
};
