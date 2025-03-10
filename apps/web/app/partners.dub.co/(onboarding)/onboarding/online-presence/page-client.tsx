"use client";

import { OnlinePresenceForm } from "@/ui/partners/online-presence-form";
import { useRouter } from "next/navigation";
import { ComponentProps } from "react";

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
