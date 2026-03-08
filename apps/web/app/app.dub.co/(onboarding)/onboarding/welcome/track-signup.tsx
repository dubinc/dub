"use client";

import { useSession } from "next-auth/react";
import { usePlausible } from "next-plausible";
import { useEffect } from "react";

export default function TrackSignup() {
  const plausible = usePlausible();
  const { data: session } = useSession();

  useEffect(() => {
    plausible("Signed Up");
  }, [session?.user]);

  return null;
}
