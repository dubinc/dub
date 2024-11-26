"use client";

import { fetcher } from "@dub/utils";
import { useEffect } from "react";
import useSWR from "swr";

export const LinkToken = () => {
  const { error } = useSWR<{ token: number }>("/api/referrals/token", fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 50000,
  });

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
