"use client";

import { UserProps } from "@/lib/types";
import { PricingPlanCard } from "@/ui/plans/components/pricing-plan-card.tsx";
import { IPricingPlan, PRICING_PLANS } from "@/ui/plans/constants.ts";
import { Button, LoadingSpinner, Modal } from "@dub/ui";
import { Payment } from "@primer-io/checkout-web";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { Flex, Heading, Text } from "@radix-ui/themes";
import {
  useCreateSubscriptionMutation,
  useUpdateSubscriptionMutation,
} from "core/api/user/subscription/subscription.hook.tsx";
import {
  CheckoutFormComponent,
  ICheckoutFormSuccess,
  IPrimerClientError,
} from "core/integration/payment/client/checkout-form";
import {
  getCalculatePriceForView,
  getPaymentPlanPrice,
  ICustomerBody,
} from "core/integration/payment/config";
import { apiInstance } from "core/lib/rest-api";
import { useSession } from "next-auth/react";
import { FC, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidV4 } from "uuid";
import { useCreateUserPaymentMutation } from "../../../core/api/user/payment/payment.hook.tsx";
import { pollPaymentStatus } from "../../../core/integration/payment/client/services/payment-status.service.ts";
import { IGetPrimerClientPaymentInfoRes } from "../../../core/integration/payment/server";

interface IPaymentComponentProps {
  cookieUser: ICustomerBody;
  reloadUserCookie: () => void;
  authUser: UserProps;
  isTrialOver: boolean;
  onScrollToPayment?: () => void;
}

export const PaymentComponent: FC<Readonly<IPaymentComponentProps>> = ({
  cookieUser,
  reloadUserCookie,
  authUser,
  isTrialOver,
}) => {
  const { update: updateSession } = useSession();
  const hasSubscription = !!authUser?.paymentData?.paymentInfo?.subscriptionId;
  const currentSubscriptionPlan =
    authUser?.paymentData?.paymentInfo?.subscriptionPlanCode;

  const checkoutFormRef = useRef<HTMLDivElement>(null);
  const [isUpdatingToken, setIsUpdatingToken] = useState(false);
  const [isSubscriptionCreation, setIsSubscriptionCreation] = useState(false);
  const [isUpdateProcessing, setIsUpdateProcessing] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<IPricingPlan>(
    PRICING_PLANS.find(
      (item) => item.paymentPlan === currentSubscriptionPlan,
    ) || PRICING_PLANS[0],
  );

  const { priceForView: totalPriceForView } = getPaymentPlanPrice({
    paymentPlan: selectedPlan.paymentPlan,
    user: cookieUser,
  });

  const totalChargePrice = getCalculatePriceForView(
    totalPriceForView,
    cookieUser,
  );

  const checkoutKey = useMemo(() => {
    return `${selectedPlan.id}-${cookieUser.paymentInfo?.clientToken?.slice(0, 10) || "no-token"}`;
  }, [selectedPlan.id, cookieUser.paymentInfo?.clientToken]);

  const { trigger: triggerCreateSubscription } =
    useCreateSubscriptionMutation();
  const { trigger: triggerCreateUserPayment } = useCreateUserPaymentMutation();
  const { trigger: triggerUpdateSubscription } =
    useUpdateSubscriptionMutation();

  const handlePaymentSuccess = async (data: ICheckoutFormSuccess) => {
    setIsSubscriptionCreation(true);

    const res = await triggerCreateSubscription({
      payment: {
        id: data.payment.id,
        orderId: data.payment.orderId,
        paymentMethodType: data.paymentMethodType,
        currencyCode: data.currencyCode,
      },
      nationalDocumentId: data.nationalDocumentId,
      first6Digits: data.first6Digits,
      metadata: { ...data.metadata },
      paymentPlan: data.paymentPlan,
    });

    if (!res?.success) {
      setIsSubscriptionCreation(false);
      toast.error("Subscription creation failed!");

      return;
    }

    toast.success("Subscription created successfully!");

    await updateSession();

    setTimeout(() => window.location.reload(), 1000);
  };

  const handleCheckoutError = ({
    error,
    data,
  }: {
    error: IPrimerClientError;
    data: { payment?: Payment };
  }) => {
    console.error("Payment failed:", error, data);
  };

  const updateClientToken = async (newPlan: IPricingPlan) => {
    const user = cookieUser;

    const { priceForPay } = getPaymentPlanPrice({
      paymentPlan: newPlan.paymentPlan,
      user,
    });

    setIsUpdatingToken(true);

    try {
      await apiInstance.patch("checkout/session", {
        json: {
          clientToken: user.paymentInfo?.clientToken,
          currencyCode: user?.currency?.currencyForPay,
          amount: priceForPay,
          order: {
            lineItems: [
              {
                itemId: uuidV4(),
                amount: priceForPay,
                quantity: 1,
              },
            ],
            countryCode: user?.currency?.countryCode || "",
          },
        },
      });

      await reloadUserCookie();
    } finally {
      setIsUpdatingToken(false);
    }
  };

  const onChangePlan = (value: string) => {
    const plan = PRICING_PLANS.find((p) => p.id === value);

    if (plan && !isUpdatingToken) {
      setSelectedPlan(plan);

      if (!hasSubscription) {
        updateClientToken(plan);
      }
    }
  };

  const handleUpdatePlan = async () => {
    setIsUpdateProcessing(true);

    const createPaymentRes = await triggerCreateUserPayment({
      paymentPlan: selectedPlan.paymentPlan,
    });

    if (!createPaymentRes?.success) {
      setIsUpdateProcessing(false);
      toast.error(`Payment creation failed.`);
      return;
    }

    const onPurchased = async () => {
      await triggerUpdateSubscription({ paymentPlan: selectedPlan.paymentPlan })
        .then(() => {
          toast.success("The plan update was successful!");
          setTimeout(() => window.location.reload(), 1000);
        })
        .catch((error) =>
          toast.error(
            `The plan updating failed: ${error?.code ?? error?.message}`,
          ),
        );
    };

    const onError = (paymentInfo?: IGetPrimerClientPaymentInfoRes) => {
      setIsUpdateProcessing(false);
      toast.error(
        `Payment failed: ${paymentInfo?.statusReason?.code ?? paymentInfo?.status ?? "unknown error"}`,
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
    <>
      <Flex
        direction="column"
        className="border-border-500 gap-4 rounded-lg px-0 py-3 lg:flex-1 lg:gap-[18px] lg:border lg:px-6 lg:py-4"
      >
        <Heading
          as="h2"
          align={{ initial: "center", lg: "left" }}
          size="4"
          className="text-neutral"
        >
          {isTrialOver ? "Choose your plan" : "Update your plan"}
        </Heading>

        <div className="border-border-500 hidden h-px w-full border-t lg:block" />

        <div className="flex flex-col justify-center gap-2 lg:gap-4">
          <RadioGroup.Root
            value={selectedPlan.id}
            onValueChange={onChangePlan}
            className="flex flex-col gap-2"
            disabled={
              isUpdatingToken || isUpdateProcessing || isSubscriptionCreation
            }
          >
            {PRICING_PLANS.map((plan) => (
              <PricingPlanCard
                key={plan.id}
                user={cookieUser}
                plan={plan}
                isSelected={selectedPlan.id === plan.id}
              />
            ))}
          </RadioGroup.Root>

          <Text as="p" size="1" className="text-neutral-800">
            You'll be charged {totalChargePrice} today. Renews every{" "}
            {selectedPlan.name.toLowerCase()}. Cancel anytime.
          </Text>

          <div ref={checkoutFormRef}>
            {!isUpdatingToken && !hasSubscription && (
              <CheckoutFormComponent
                key={checkoutKey}
                locale="en"
                theme="light"
                user={cookieUser}
                paymentPlan={selectedPlan.paymentPlan}
                handleCheckoutSuccess={handlePaymentSuccess}
                handleCheckoutError={handleCheckoutError}
                submitBtn={{
                  text: isTrialOver
                    ? `Subscribe to ${selectedPlan.name}`
                    : "Update plan",
                }}
              />
            )}
            {isUpdatingToken && !hasSubscription && (
              <div className="flex items-center justify-center py-4">
                <Text size="2" className="text-neutral-600">
                  Updating payment information...
                </Text>
              </div>
            )}

            {hasSubscription && (
              <Button
                className="block"
                loading={isUpdateProcessing}
                disabled={
                  currentSubscriptionPlan === selectedPlan.paymentPlan ||
                  isUpdateProcessing
                }
                onClick={handleUpdatePlan}
                text={isUpdateProcessing ? null : "Upgrade Plan"}
              />
            )}
          </div>

          <Text as="p" size="1" className="text-center text-neutral-800">
            🔒 Secure payment • Cancel anytime • No hidden fees
          </Text>
        </div>
      </Flex>

      <Modal
        showModal={isSubscriptionCreation}
        preventDefaultClose
        setShowModal={() => setIsSubscriptionCreation(false)}
      >
        <div className="flex flex-col items-center gap-2 p-4">
          <span className="text-lg font-semibold">
            Your Order Is Being Processed
          </span>
          <LoadingSpinner />
          <span className="text-center">
            Please wait while we finalize your payment and create your digital
            product. Closing this tab may interrupt the process.
          </span>
        </div>
      </Modal>
    </>
  );
};
