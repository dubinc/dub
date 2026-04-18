"use client";

import { useSession } from "next-auth/react";
import { usePlausible } from "next-plausible";
import { useEffect } from "react";
import { useOnboardingTrialVariant } from "../use-onboarding-trial-variant";

export default function TrackSignup() {
  const plausible = usePlausible();
  const { data: session } = useSession();
  const { isTrialVariant } = useOnboardingTrialVariant();

  useEffect(() => {
    plausible("Signed Up");
    plausible(`Started Onboarding (${isTrialVariant ? "Trial" : "No Trial"})`);
  }, [session?.user, isTrialVariant]);

  return null;
}
