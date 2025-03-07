"use client";

import { useRouter } from "next/navigation";
import { ComponentProps } from "react";
import { OnlinePresenceForm } from "./online-presence-form";

export function OnlinePresencePageClient({
  country,
  ...rest
}: { country: string | null } & ComponentProps<typeof OnlinePresenceForm>) {
  const router = useRouter();

  return (
    <OnlinePresenceForm
      onSubmitSuccessful={() =>
        router.push(country === "US" ? "/onboarding/verify" : "/programs")
      }
      {...rest}
    />
  );
}
