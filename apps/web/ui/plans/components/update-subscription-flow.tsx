"use client";

import { IPricingPlan } from "@/ui/plans/constants";
import { Button } from "@dub/ui";
import { useCreateUserPaymentMutation } from "core/api/user/payment/payment.hook";
import { useUpdateSubscriptionMutation } from "core/api/user/subscription/subscription.hook";
import { pollPaymentStatus } from "core/integration/payment/client/services/payment-status.service.ts";
import { ICustomerBody } from "core/integration/payment/config";
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

const paymentPlanWeight = {
  PRICE_MONTH_PLAN: 1,
  PRICE_QUARTER_PLAN: 2,
  PRICE_YEAR_PLAN: 3,
};

export const UpdateSubscriptionFlow: FC<Readonly<IUpdateSubscriptionProps>> = ({
  user,
  selectedPlan,
  currentSubscriptionPlan,
  isProcessing,
  setIsProcessing,
}) => {
  const router = useRouter();
  const { update: updateSession } = useSession();

  const { trigger: triggerCreateUserPayment } = useCreateUserPaymentMutation();
  const { trigger: triggerUpdateSubscription } =
    useUpdateSubscriptionMutation();

  const buttonText = useMemo(() => {
    switch (true) {
      case selectedPlan.paymentPlan === currentSubscriptionPlan:
        return "Your Active Plan";
      case paymentPlanWeight[selectedPlan.paymentPlan] <
        paymentPlanWeight?.[currentSubscriptionPlan!]:
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
          });

          const currentOperation = () => {
            switch (true) {
              case selectedPlan.paymentPlan === currentSubscriptionPlan:
                return "upgrade";
              case paymentPlanWeight[selectedPlan.paymentPlan] <
                paymentPlanWeight?.[currentSubscriptionPlan!]:
                return "downgrade";
              default:
                return "upgrade";
            }
          };

          toast.success(`The plan ${currentOperation()} was successful!`);

          // Update session data to reflect the new subscription plan
          await updateSession();

          // Force refresh user data cache
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
