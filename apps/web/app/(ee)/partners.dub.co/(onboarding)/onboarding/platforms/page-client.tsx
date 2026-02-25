"use client";

import { PartnerProps } from "@/lib/types";
import { PartnerPlatformsForm } from "@/ui/partners/partner-platforms-form";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export function OnboardingPlatformsPageClient({
  partner,
}: {
  partner: Pick<PartnerProps, "country" | "platforms">;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  return (
    <>
      <PartnerPlatformsForm
        onSubmitSuccessful={() =>
          router.push(
            `/onboarding/payouts${next ? `?next=${encodeURIComponent(next)}` : ""}`,
          )
        }
        partner={partner}
        variant="onboarding"
      />
      <Link
        href={`/onboarding/payouts${next ? `?next=${encodeURIComponent(next)}` : ""}`}
        className="text-sm font-medium text-neutral-800 transition-colors hover:text-neutral-950"
      >
        I'll complete this later
      </Link>
    </>
  );
}
