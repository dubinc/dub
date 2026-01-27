"use client";

import { PartnerProps } from "@/lib/types";
import { PartnerPlatformsForm } from "@/ui/partners/partner-platforms-form";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function OnboardingPlatformsPageClient({
  partner,
}: {
  partner: Pick<PartnerProps, "country" | "platforms">;
}) {
  const router = useRouter();

  return (
    <>
      <PartnerPlatformsForm
        onSubmitSuccessful={() => router.push("/onboarding/payouts")}
        partner={partner}
        variant="onboarding"
      />
      <Link
        href="/onboarding/payouts"
        className="text-sm font-medium text-neutral-800 transition-colors hover:text-neutral-950"
      >
        I'll complete this later
      </Link>
    </>
  );
}
