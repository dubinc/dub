"use client";

import { fetcher } from "@dub/utils";
import { useEmbedToken } from "app/app.dub.co/embed/use-embed-token";
import { useEffect } from "react";
import useSWR from "swr";

export const ReferralsReferralsEmbedToken = () => {
  const token = useEmbedToken();

  const { error } = useSWR<{ token: number }>(
    `/api/embed/referrals/token?token=${token}`,
    fetcher,
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
