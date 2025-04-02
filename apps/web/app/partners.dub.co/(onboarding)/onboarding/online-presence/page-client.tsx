"use client";

import { OnlinePresenceForm } from "@/ui/partners/online-presence-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ComponentProps } from "react";

export function OnlinePresencePageClient({
  country,
  ...rest
}: { country: string | null } & ComponentProps<typeof OnlinePresenceForm>) {
  const router = useRouter();

  return (
    <>
      <OnlinePresenceForm
        onSubmitSuccessful={() =>
          router.push(country === "US" ? "/onboarding/verify" : "/programs")
        }
        {...rest}
      />
      <Link
        href="/onboarding/verify"
        className="text-sm text-neutral-500 transition-colors hover:text-neutral-800"
      >
        I'll complete this later
      </Link>
    </>
  );
}
