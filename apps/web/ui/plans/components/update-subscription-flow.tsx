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
import { FC, useMemo, useState } from "react";
import { toast } from "sonner";

interface IUpdateSubscriptionProps {
  user: ICustomerBody;
  currentSubscriptionPlan: string | undefined;
  selectedPlan: IPricingPlan;
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
}) => {
  const router = useRouter();
  const [isUpdateProcessing, setIsUpdateProcessing] = useState(false);
  const { update: updateSession } = useSession();

  const { trigger: triggerCreateUserPayment } = useCreateUserPaymentMutation();
  const { trigger: triggerUpdateSubscription } =
    useUpdateSubscriptionMutation();

  const buttonText = useMemo(() => {
    switch (true) {
      case selectedPlan.paymentPlan === currentSubscriptionPlan:
        return "Upgrade Plan";
      case paymentPlanWeight[selectedPlan.paymentPlan] <
        paymentPlanWeight?.[currentSubscriptionPlan!]:
        return "Downgrade Plan";
      default:
        return "Upgrade Plan";
    }
  }, [selectedPlan, currentSubscriptionPlan]);

  const handleUpdatePlan = async () => {
    setIsUpdateProcessing(true);

    generateTrackingUpsellEvent({
      user,
      paymentPlan: selectedPlan.paymentPlan,
      stage: "attempt",
    });

    const createPaymentRes = await triggerCreateUserPayment({
      paymentPlan: selectedPlan.paymentPlan,
    });

    const onError = (info?: IGetPrimerClientPaymentInfoRes) => {
      setIsUpdateProcessing(false);

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

          setTimeout(() => router.push("/"), 500);
        })
        .catch((error) =>
          toast.error(
            `The plan updating failed: ${error?.code ?? error?.message}`,
          ),
        );
    };

    if (!createPaymentRes?.success) {
      setIsUpdateProcessing(false);
      toast.error(`Payment creation failed.`);
      return;
    }

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
      loading={isUpdateProcessing}
      disabled={
        currentSubscriptionPlan === selectedPlan.paymentPlan ||
        isUpdateProcessing
      }
      onClick={handleUpdatePlan}
      text={isUpdateProcessing ? null : buttonText}
    />
  );
};
