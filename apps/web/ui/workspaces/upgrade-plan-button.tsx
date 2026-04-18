"use client";

import { wouldLosePartnerAccess } from "@/lib/plans/has-partner-access";
import { wouldLoseAdvancedFeatures } from "@/lib/plans/would-lose-advanced-features";
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
import { useMemo, useState } from "react";
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
    plan: currentPlan,
    planPeriod: currentPlanPeriod,
    stripeId,
    defaultProgramId,
    trialEndsAt,
  } = useWorkspace();

  const isTrialActive = isWorkspaceBillingTrialActive(trialEndsAt);

  const plausible = usePlausible();

  const selectedPlan =
    SELF_SERVE_PAID_PLANS.find(
      (p) => p.name.toLowerCase() === plan.toLowerCase(),
    ) ?? SELF_SERVE_PAID_PLANS[0];

  const [clicked, setClicked] = useState(false);

  const queryString = searchParams.toString();

  const isCurrentPlan =
    currentPlan === selectedPlan.name.toLowerCase() &&
    period === currentPlanPeriod;

  // Check if this plan change would lose partner access / advanced features
  const { losesPartnerAccess, losesAdvancedFeatures } = useMemo(() => {
    if (currentPlan && defaultProgramId) {
      return {
        losesPartnerAccess: wouldLosePartnerAccess({
          currentPlan,
          newPlan: selectedPlan.name.toLowerCase(),
        }),
        losesAdvancedFeatures: wouldLoseAdvancedFeatures({
          currentPlan,
          newPlan: selectedPlan.name.toLowerCase(),
        }),
      };
    }
    return {
      losesPartnerAccess: false,
      losesAdvancedFeatures: false,
    };
  }, [currentPlan, defaultProgramId, selectedPlan.name]);

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
      confirmationMode:
        losesAdvancedFeatures && !losesPartnerAccess
          ? "advanced-downgrade"
          : "program-downgrade",
    });

  const { StartPaidPlanModal, setShowStartPaidPlanModal } =
    useStartPaidPlanModal();

  const handleClick = () => {
    if (isCurrentPlan && isTrialActive) {
      setShowStartPaidPlanModal(true);
      return;
    }
    if (losesPartnerAccess || losesAdvancedFeatures) {
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
          !currentPlan
            ? "Loading..."
            : isCurrentPlan
              ? isTrialActive
                ? "Activate plan"
                : "Your current plan"
              : currentPlan === "free"
                ? `Start ${PARTNER_CHECKOUT_TRIAL_PERIOD_DAYS}-day trial · ${selectedPlan.name} ${capitalize(period)}`
                : `Switch to ${selectedPlan.name} ${capitalize(period)}`
        }
        loading={clicked || !currentPlan}
        disabled={!workspaceSlug || (isCurrentPlan && !isTrialActive)}
        onClick={handleClick}
        {...rest}
      />
    </>
  );
}
