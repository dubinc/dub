"use client";

import { getValidInternalRedirectPath } from "@/lib/middleware/utils/is-valid-internal-redirect";
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
  const next = getValidInternalRedirectPath({
    redirectPath: searchParams.get("next"),
    currentUrl: window.location.href,
  });

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
        className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-800"
      >
        I'll complete this later
      </Link>
    </>
  );
}
