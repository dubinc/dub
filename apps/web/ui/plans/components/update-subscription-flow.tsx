"use client";

import { useTrialStatus } from "@/lib/contexts/trial-status-context.tsx";
import { IPricingPlan } from "@/ui/plans/constants";
import { Button } from "@dub/ui";
import { useCreateUserPaymentMutation } from "core/api/user/payment/payment.hook";
import { useUpdateSubscriptionMutation } from "core/api/user/subscription/subscription.hook";
import {
  getSubscriptionRenewalAction,
  subscriptionPlansWeight,
} from "core/constants/subscription-plans-weight.ts";
import { setPeopleAnalytic } from "core/integration/analytic";
import { pollPaymentStatus } from "core/integration/payment/client/services/payment-status.service.ts";
import {
  getChargePeriodDaysIdByPlan,
  ICustomerBody,
  TPaymentPlan,
} from "core/integration/payment/config";
import { IGetPrimerClientPaymentInfoRes } from "core/integration/payment/server";
import { generateTrackingUpsellEvent } from "core/services/events/upsell-events.service.ts";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Dispatch, FC, SetStateAction, useMemo } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

interface IUpdateSubscriptionProps {
  user: ICustomerBody;
  currentSubscriptionPlan: string | undefined;
  selectedPlan: IPricingPlan;
  isProcessing: boolean;
  setIsProcessing: Dispatch<SetStateAction<boolean>>;
}

export const UpdateSubscriptionFlow: FC<Readonly<IUpdateSubscriptionProps>> = ({
  user,
  selectedPlan,
  currentSubscriptionPlan,
  isProcessing,
  setIsProcessing,
}) => {
  const router = useRouter();

  const { setIsTrialOver } = useTrialStatus();
  const { update: updateSession } = useSession();

  const { trigger: triggerCreateUserPayment } = useCreateUserPaymentMutation();
  const { trigger: triggerUpdateSubscription } =
    useUpdateSubscriptionMutation();

  const buttonText = useMemo(() => {
    switch (true) {
      case selectedPlan.paymentPlan === currentSubscriptionPlan:
        return "Your Active Plan";
      case subscriptionPlansWeight[selectedPlan.paymentPlan] <
        subscriptionPlansWeight?.[currentSubscriptionPlan!]:
        return "Downgrade Plan";
      default:
        return "Upgrade Plan";
    }
  }, [selectedPlan, currentSubscriptionPlan]);

  const handleUpdatePlan = async () => {
    setIsProcessing(true);

    generateTrackingUpsellEvent({
      user,
      paymentPlan: selectedPlan.paymentPlan,
      stage: "attempt",
      additionalParams: {
        billing_action: getSubscriptionRenewalAction(
          selectedPlan.paymentPlan,
          currentSubscriptionPlan as TPaymentPlan,
        ),
      },
    });

    const createPaymentRes = await triggerCreateUserPayment({
      paymentPlan: selectedPlan.paymentPlan,
    });

    if (!createPaymentRes?.success) {
      setIsProcessing(false);
      generateTrackingUpsellEvent({
        user,
        paymentPlan: selectedPlan.paymentPlan,
        stage: "error",
        additionalParams: {
          error_code: "PAYMENT_CREATION_FAILED",
          billing_action: getSubscriptionRenewalAction(
            selectedPlan.paymentPlan,
            currentSubscriptionPlan as TPaymentPlan,
          ),
        },
      });
      toast.error(`Payment creation failed.`);

      return;
    }

    const onError = (info?: IGetPrimerClientPaymentInfoRes) => {
      setIsProcessing(false);

      generateTrackingUpsellEvent({
        user,
        paymentPlan: selectedPlan.paymentPlan,
        stage: "error",
        paymentId: info?.id ?? createPaymentRes?.data?.paymentId,
        additionalParams: {
          error_code: info?.statusReason?.code ?? info?.status ?? null,
          billing_action: getSubscriptionRenewalAction(
            selectedPlan.paymentPlan,
            currentSubscriptionPlan as TPaymentPlan,
          ),
        },
      });

      toast.error(
        `Payment failed: ${info?.statusReason?.code ?? info?.status ?? "unknown error"}`,
      );
    };

    const onPurchased = async (info: IGetPrimerClientPaymentInfoRes) => {
      await triggerUpdateSubscription({ paymentPlan: selectedPlan.paymentPlan })
        .then(async () => {
          generateTrackingUpsellEvent({
            user,
            paymentPlan: selectedPlan.paymentPlan,
            stage: "success",
            paymentId: info?.id,
            additionalParams: {
              billing_action: getSubscriptionRenewalAction(
                selectedPlan.paymentPlan,
                currentSubscriptionPlan as TPaymentPlan,
              ),
            },
          });

          toast.success(
            `The plan ${getSubscriptionRenewalAction(selectedPlan.paymentPlan, currentSubscriptionPlan as TPaymentPlan)} was successful!`,
          );

          const chargePeriodDays = getChargePeriodDaysIdByPlan({
            paymentPlan: selectedPlan.paymentPlan,
            user,
          });

          setPeopleAnalytic({
            plan_name: selectedPlan.paymentPlan,
            charge_period_days: chargePeriodDays,
          });

          setIsTrialOver(false);
          await updateSession();
          await mutate("/api/user");

          // Force refresh the page cache
          router.refresh();
          router.push("/");
        })
        .catch((error) =>
          toast.error(
            `The plan updating failed: ${error?.code ?? error?.message}`,
          ),
        );
    };

    await pollPaymentStatus({
      paymentId: createPaymentRes!.data!.paymentId,
      onPurchased,
      onError,
      initialStatus: createPaymentRes!.data!.status,
    });
  };

  return (
    <Button
      className="block"
      loading={isProcessing}
      disabled={
        currentSubscriptionPlan === selectedPlan.paymentPlan || isProcessing
      }
      onClick={handleUpdatePlan}
      text={isProcessing ? null : buttonText}
    />
  );
};
