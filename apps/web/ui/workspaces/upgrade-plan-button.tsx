"use client";

import { shouldEnableStripeCheckoutTrial } from "@/lib/billing/trial-checkout-experiment";
import { wouldLosePartnerAccess } from "@/lib/plans/has-partner-access";
import { getStripe } from "@/lib/stripe/client";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, ButtonProps } from "@dub/ui";
import {
  APP_DOMAIN,
  capitalize,
  isWorkspaceBillingTrialActive,
  PARTNER_CHECKOUT_TRIAL_PERIOD_DAYS,
  SELF_SERVE_PAID_PLANS,
} from "@dub/utils";
import { usePlausible } from "next-plausible";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { usePlanChangeConfirmationModal } from "../modals/plan-change-confirmation-modal";
import { useStartPaidPlanModal } from "../modals/start-paid-plan-modal";

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
    id: workspaceId,
    plan: currentPlan,
    stripeId,
    defaultProgramId,
    trialEndsAt,
    flags,
  } = useWorkspace();

  const checkoutTrialEnabled = Boolean(
    workspaceId && shouldEnableStripeCheckoutTrial(flags, workspaceId),
  );

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
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error?.message ?? "Failed to start checkout.");
        }

        plausible(
          checkoutTrialEnabled
            ? "Opened Checkout Trial"
            : "Opened Checkout No Trial",
        );
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

  const { StartPaidPlanModal, setShowStartPaidPlanModal } =
    useStartPaidPlanModal();

  const handleClick = () => {
    if (isCurrentPlan && isWorkspaceBillingTrialActive(trialEndsAt)) {
      setShowStartPaidPlanModal(true);
      return;
    }
    if (losesPartnerAccess) {
      setShowPlanChangeConfirmationModal(true);
    } else {
      performUpgrade();
    }
  };

  return (
    <>
      <PlanChangeConfirmationModal />
      <StartPaidPlanModal />
      <Button
        text={
          isCurrentPlan
            ? isWorkspaceBillingTrialActive(trialEndsAt)
              ? "Activate plan"
              : "Your current plan"
            : currentPlan === "free"
              ? checkoutTrialEnabled
                ? `Start ${PARTNER_CHECKOUT_TRIAL_PERIOD_DAYS}-day trial`
                : `Get started with ${selectedPlan.name} ${capitalize(period)}`
              : `Switch to ${selectedPlan.name} ${capitalize(period)}`
        }
        loading={clicked}
        disabled={
          !workspaceSlug ||
          (isCurrentPlan && !isWorkspaceBillingTrialActive(trialEndsAt))
        }
        onClick={handleClick}
        {...rest}
      />
    </>
  );
}
