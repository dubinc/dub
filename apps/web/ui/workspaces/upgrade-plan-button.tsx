"use client";

import { getStripe } from "@/lib/stripe/client";
import { Button } from "@dub/ui";
import { APP_DOMAIN, capitalize, SELF_SERVE_PAID_PLANS } from "@dub/utils";
import { trackEvent } from "fathom-client";
import { usePlausible } from "next-plausible";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";

export function UpgradePlanButton({
  plan,
  period,
  workspaceSlug,
  text,
  onboarding = false,
}: {
  plan: string;
  period: "monthly" | "yearly";
  workspaceSlug?: string;
  text?: string;
  onboarding?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const plausible = usePlausible();

  const selectedPlan =
    SELF_SERVE_PAID_PLANS.find(
      (p) => p.name.toLowerCase() === plan.toLowerCase(),
    ) ?? SELF_SERVE_PAID_PLANS[0];

  const [clicked, setClicked] = useState(false);

  const queryString = searchParams.toString();

  return (
    <Button
      text={text || `Upgrade to ${selectedPlan.name} ${capitalize(period)}`}
      loading={clicked}
      disabled={!workspaceSlug}
      onClick={() => {
        setClicked(true);
        fetch(`/api/workspaces/${workspaceSlug}/billing/upgrade`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan,
            period,
            baseUrl: `${APP_DOMAIN}${pathname}${queryString.length > 0 ? `?${queryString}` : ""}`,
            onboarding,
          }),
        })
          .then(async (res) => {
            trackEvent("Opened Checkout");
            plausible("Opened Checkout");
            posthog.capture("checkout_opened", {
              currentPlan: capitalize(plan),
              newPlan: selectedPlan.name,
            });
            if (plan === "free") {
              const data = await res.json();
              const { id: sessionId } = data;
              const stripe = await getStripe();
              stripe?.redirectToCheckout({ sessionId });
            } else {
              const { url } = await res.json();
              router.push(url);
            }
          })
          .catch((err) => {
            alert(err);
          })
          .finally(() => {
            setClicked(false);
          });
      }}
    />
  );
}
