"use client";

import { PartnerProps } from "@/lib/types";
import { OnlinePresenceForm } from "@/ui/partners/online-presence-form";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function OnlinePresencePageClient({
  partner,
}: {
  partner: Pick<PartnerProps, "country" | "platforms">;
}) {
  const router = useRouter();

  return (
    <>
      <OnlinePresenceForm
        onSubmitSuccessful={() =>
          router.push(
            partner.country === "US" ? "/onboarding/verify" : "/programs",
          )
        }
        partner={partner}
        variant="onboarding"
      />
      <Link
        href="/onboarding/verify"
        className="text-sm font-medium text-neutral-800 transition-colors hover:text-neutral-950"
      >
        I'll complete this later
      </Link>
    </>
  );
}
