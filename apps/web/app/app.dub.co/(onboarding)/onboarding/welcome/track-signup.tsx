"use client";

import { useSession } from "next-auth/react";
import { usePlausible } from "next-plausible";
import posthog from "posthog-js";
import { useEffect } from "react";

export default function TrackSignup() {
  const plausible = usePlausible();
  const { data: session } = useSession();

  useEffect(() => {
    plausible("Signed Up");
    if (session?.user) {
      posthog.identify(session.user["id"], {
        email: session.user.email,
        name: session.user.name,
      });
      posthog.capture("user_signed_up");
    }
  }, [session?.user]);

  return null;
}
