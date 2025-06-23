"use client";

import { UserProps } from "@/lib/types";
import { PricingPlanCard } from "@/ui/plans/components/pricing-plan-card.tsx";
import { IPricingPlan, PRICING_PLANS } from "@/ui/plans/constants.ts";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { Flex, Heading, Text } from "@radix-ui/themes";
import {
  getCalculatePriceForView,
  getPaymentPlanPrice,
  ICustomerBody,
} from "core/integration/payment/config";
import { apiInstance } from "core/lib/rest-api";
import { FC, useMemo, useState } from "react";
import { v4 as uuidV4 } from "uuid";
import { CreateSubscriptionFlow } from "./create-subscription-flow.tsx";
import { UpdateSubscriptionFlow } from "./update-subscription-flow.tsx";

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
  const hasSubscription = !!authUser?.paymentData?.paymentInfo?.subscriptionId;
  const currentSubscriptionPlan =
    authUser?.paymentData?.paymentInfo?.subscriptionPlanCode;

  const [isUpdatingToken, setIsUpdatingToken] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<IPricingPlan>(
    PRICING_PLANS.find(
      (item) => item.paymentPlan === currentSubscriptionPlan,
    ) || PRICING_PLANS[0],
  );

  const { priceForView: totalPriceForView, priceForPay } = getPaymentPlanPrice({
    paymentPlan: selectedPlan.paymentPlan,
    user: cookieUser,
  });

  const totalChargePrice = getCalculatePriceForView(
    totalPriceForView,
    cookieUser,
  );

  const checkoutKey = useMemo(() => {
    return `${selectedPlan.id}-${
      cookieUser.paymentInfo?.clientToken?.slice(0, 10) || "no-token"
    }`;
  }, [selectedPlan.id, cookieUser.paymentInfo?.clientToken]);

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

  return (
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

      <div className="flex max-w-[436px] flex-col justify-center gap-2 lg:gap-4">
        <RadioGroup.Root
          value={selectedPlan.id}
          onValueChange={onChangePlan}
          className="flex flex-col gap-2"
          disabled={isUpdatingToken}
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

        <div>
          {!hasSubscription && (
            <CreateSubscriptionFlow
              amount={priceForPay}
              key={checkoutKey}
              cookieUser={cookieUser}
              selectedPlan={selectedPlan}
              checkoutKey={checkoutKey}
              isUpdatingToken={isUpdatingToken}
            />
          )}
          {hasSubscription && (
            <UpdateSubscriptionFlow
              cookieUser={cookieUser}
              currentSubscriptionPlan={currentSubscriptionPlan}
              selectedPlan={selectedPlan}
            />
          )}
        </div>

        <Text as="p" size="1" className="text-center text-neutral-800">
          🔒 Secure payment • Cancel anytime • No hidden fees
        </Text>
      </div>
    </Flex>
  );
};
