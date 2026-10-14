"use client";

import { useSession } from "@/lib/better-auth/use-session";
import { usePlausible } from "next-plausible";
import { useEffect } from "react";

export default function TrackSignup() {
  const plausible = usePlausible();
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user) {
      plausible("Signed Up");
    }
  }, [session?.user]);

  return null;
}
