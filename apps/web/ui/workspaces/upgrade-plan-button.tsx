"use client";

import { wouldLosePartnerAccess } from "@/lib/plans/has-partner-access";
import { wouldLoseAdvancedFeatures } from "@/lib/plans/would-lose-advanced-features";
import { getStripe } from "@/lib/stripe/client";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, ButtonProps } from "@dub/ui";
import {
  APP_DOMAIN,
  capitalize,
  DUB_TRIAL_PERIOD_DAYS,
  isWorkspaceBillingTrialActive,
  SELF_SERVE_PAID_PLANS,
} from "@dub/utils";
import { usePlausible } from "next-plausible";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { usePlanChangeConfirmationModal } from "../modals/plan-change-confirmation-modal";
import { useStartPaidPlanModal } from "../modals/start-paid-plan-modal";
import { useSwitchTrialPlanModal } from "../modals/switch-trial-plan-modal";

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

  const plausible = usePlausible();
  const product = searchParams.get("product");
  const isTrialActive = isWorkspaceBillingTrialActive(trialEndsAt);

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

  const performUpgrade = async () => {
    setClicked(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceSlug}/billing/upgrade`,
        {
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
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to start checkout.");
      }

      if (!stripeId || currentPlan === "free") {
        const data = await res.json();
        const { id: sessionId } = data;
        plausible("Opened Checkout", {
          props: {
            ...(product && { product: capitalize(product) }),
            plan: capitalize(selectedPlan.name),
            planPeriod: capitalize(period),
          },
        });
        const stripe = await getStripe();
        stripe?.redirectToCheckout({ sessionId });
      } else {
        const { url } = await res.json();
        router.push(url);
      }
    } catch (err) {
      alert(err);
    } finally {
      setClicked(false);
    }
  };

  const { setShowPlanChangeConfirmationModal, PlanChangeConfirmationModal } =
    usePlanChangeConfirmationModal({
      newPlan: plan,
      newPeriod: period,
      newTier: tier,
      onConfirm: performUpgrade,
      confirmationMode:
        losesAdvancedFeatures && !losesPartnerAccess
          ? "advanced-downgrade"
          : "program-downgrade",
    });

  const { StartPaidPlanModal, setShowStartPaidPlanModal } =
    useStartPaidPlanModal();

  const isSwitchingTrialPlan =
    isTrialActive && !isCurrentPlan && currentPlan !== "free";

  const { SwitchTrialPlanModal, setShowSwitchTrialPlanModal } =
    useSwitchTrialPlanModal({
      newPlan: plan,
      newPeriod: period,
      newTier: tier,
      onConfirm: performUpgrade,
    });

  const handleClick = () => {
    if (isCurrentPlan && isTrialActive) {
      setShowStartPaidPlanModal(true);
      return;
    }
    if (losesPartnerAccess || losesAdvancedFeatures) {
      setShowPlanChangeConfirmationModal(true);
      return;
    }
    if (isSwitchingTrialPlan) {
      setShowSwitchTrialPlanModal(true);
      return;
    } else {
      performUpgrade();
    }
  };

  return (
    <>
      <PlanChangeConfirmationModal />
      <StartPaidPlanModal />
      <SwitchTrialPlanModal />
      <Button
        // these are the default text for onboarding plan selector
        text={
          !currentPlan
            ? "Loading..."
            : isCurrentPlan
              ? isTrialActive
                ? "Activate plan"
                : "Current plan"
              : currentPlan === "free"
                ? `Start ${DUB_TRIAL_PERIOD_DAYS}-day trial · ${selectedPlan.name} ${capitalize(period)}`
                : isTrialActive
                  ? `Switch trial to ${selectedPlan.name} ${capitalize(period)}`
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
