"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function RefreshPartner() {
  const { data: session, update } = useSession();

  // if user has no default partner, refresh to get default partner
  useEffect(() => {
    if (session?.user && !session.user["defaultPartnerId"]) {
      console.log("no default partner, refreshing");
      update();
    }
  }, [session]);

  return null;
}
