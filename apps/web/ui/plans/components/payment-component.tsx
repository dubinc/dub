"use client";

import { PricingPlanCard } from "@/ui/plans/components/pricing-plan-card.tsx";
import { IPricingPlan, PRICING_PLANS } from "@/ui/plans/constants.ts";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { Flex, Heading, Text } from "@radix-ui/themes";
import { useUpdateUserSessionMutation } from "core/api/user/payment/payment.hook.tsx";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface.ts";
import {
  getCalculatePriceForView,
  getPaymentPlanPrice,
  ICustomerBody,
} from "core/integration/payment/config";
import { FC, useState } from "react";
import { CreateSubscriptionFlow } from "./create-subscription-flow.tsx";
import { UpdateSubscriptionFlow } from "./update-subscription-flow.tsx";
import { FeaturesAccess } from '@/lib/actions/check-features-access-auth-less.ts';

interface IPaymentComponentProps {
  user: ICustomerBody;
  featuresAccess: FeaturesAccess;
  onScrollToPayment?: () => void;
}

export const PaymentComponent: FC<Readonly<IPaymentComponentProps>> = ({
  user,
  featuresAccess,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { trigger: triggerUpdateUserSession } = useUpdateUserSessionMutation();

  const currentSubscriptionPlan = user?.paymentInfo?.subscriptionPlanCode;

  const [isUpdatingToken, setIsUpdatingToken] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<IPricingPlan>(
    PRICING_PLANS.find(
      (item) => item.paymentPlan === currentSubscriptionPlan,
    ) || PRICING_PLANS[0],
  );

  const { priceForView: totalPriceForView, priceForPay } = getPaymentPlanPrice({
    paymentPlan: selectedPlan.paymentPlan,
    user,
  });

  const totalChargePrice = getCalculatePriceForView(totalPriceForView, user);

  const updateClientToken = async (newPlan: IPricingPlan) => {
    setIsUpdatingToken(true);

    try {
      await triggerUpdateUserSession({
        paymentPlan: newPlan.paymentPlan,
      });
    } finally {
      setIsUpdatingToken(false);
    }
  };

  const onChangePlan = (value: string) => {
    const plan = PRICING_PLANS.find((p) => p.id === value);

    if (plan && !isUpdatingToken) {
      trackClientEvents({
        event: EAnalyticEvents.PLAN_PICKER_CLICKED,
        params: {
          event_category: "Authorized",
          email: user.email,
          plan_name: plan.paymentPlan,
          page_name: "account",
          content_group: "plans",
        },
        sessionId: user.id,
      });

      setSelectedPlan(plan);

      if (!featuresAccess.isSubscribed) {
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
        {!featuresAccess.featuresAccess ? "Choose your plan" : "Update your plan"}
      </Heading>

      <div className="border-border-500 hidden h-px w-full border-t lg:block" />

      <div className="flex flex-col justify-center gap-2 lg:gap-4">
        <RadioGroup.Root
          value={selectedPlan.id}
          onValueChange={onChangePlan}
          className="flex flex-col gap-2"
          disabled={isUpdatingToken || isProcessing}
        >
          {PRICING_PLANS.map((plan) => (
            <PricingPlanCard
              key={plan.id}
              user={user}
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
          {featuresAccess.isSubscribed ? (
            <UpdateSubscriptionFlow
              user={user}
              currentSubscriptionPlan={currentSubscriptionPlan}
              selectedPlan={selectedPlan}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
            />
          ) : (
            <CreateSubscriptionFlow
              user={user}
              amount={priceForPay}
              selectedPlan={selectedPlan}
              isUpdatingToken={isUpdatingToken}
              setIsProcessing={setIsProcessing}
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
