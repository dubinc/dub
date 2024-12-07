import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import useSWR from "swr";
import { PartnerProps } from "../types";

export default function usePartnerProfile() {
  const { data: session, update, status } = useSession();

  // if user has no default partner, refresh to get default partner
  useEffect(() => {
    if (session?.user && !session.user["defaultPartnerId"]) {
      console.log("no default partner, refreshing");
      update();
    }
  }, [session]);

  const partnerId = session?.user?.["defaultPartnerId"];

  const {
    data: partner,
    error,
    isLoading,
  } = useSWR<PartnerProps>(partnerId && `/api/partners/${partnerId}`, fetcher, {
    dedupingInterval: 60000,
  });

  return {
    partner,
    error,
    loading: status === "loading" || isLoading,
  };
}
