"use client";

import { wouldLosePartnerAccess } from "@/lib/plans/has-partner-access";
import { getStripe } from "@/lib/stripe/client";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, ButtonProps } from "@dub/ui";
import { APP_DOMAIN, capitalize, SELF_SERVE_PAID_PLANS } from "@dub/utils";
import { usePlausible } from "next-plausible";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { usePlanChangeConfirmationModal } from "../modals/plan-change-confirmation-modal";

export function UpgradePlanButton({
  plan,
  tier,
  period,
  ...rest
}: {
  plan: string;
  tier?: number;
  period: "monthly" | "yearly";
} & Partial<ButtonProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    slug: workspaceSlug,
    plan: currentPlan,
    stripeId,
    defaultProgramId,
  } = useWorkspace();

  const plausible = usePlausible();

  const selectedPlan =
    SELF_SERVE_PAID_PLANS.find(
      (p) => p.name.toLowerCase() === plan.toLowerCase(),
    ) ?? SELF_SERVE_PAID_PLANS[0];

  const [clicked, setClicked] = useState(false);

  const queryString = searchParams.toString();

  const isCurrentPlan = currentPlan === selectedPlan.name.toLowerCase();

  // Check if this plan change would lose partner access
  const losesPartnerAccess =
    currentPlan &&
    defaultProgramId &&
    wouldLosePartnerAccess({
      currentPlan,
      newPlan: selectedPlan.name.toLowerCase(),
    });

  const performUpgrade = () => {
    setClicked(true);
    fetch(`/api/workspaces/${workspaceSlug}/billing/upgrade`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan,
        tier,
        period,
        baseUrl: `${APP_DOMAIN}${pathname}${queryString.length > 0 ? `?${queryString}` : ""}`,
        onboarding: searchParams.get("workspace") ? "true" : "false",
      }),
    })
      .then(async (res) => {
        plausible("Opened Checkout");
        if (!stripeId || currentPlan === "free") {
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
  };

  const { setShowPlanChangeConfirmationModal, PlanChangeConfirmationModal } =
    usePlanChangeConfirmationModal({
      onConfirm: performUpgrade,
    });

  const handleClick = () => {
    if (losesPartnerAccess) {
      setShowPlanChangeConfirmationModal(true);
    } else {
      performUpgrade();
    }
  };

  return (
    <>
      <PlanChangeConfirmationModal />
      <Button
        text={
          isCurrentPlan
            ? "Your current plan"
            : currentPlan === "free"
              ? `Get started with ${selectedPlan.name} ${capitalize(period)}`
              : `Switch to ${selectedPlan.name} ${capitalize(period)}`
        }
        loading={clicked}
        disabled={!workspaceSlug || isCurrentPlan}
        onClick={handleClick}
        {...rest}
      />
    </>
  );
}
