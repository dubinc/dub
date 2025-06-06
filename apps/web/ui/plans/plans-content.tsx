"use client";

import { useTrialStatus } from "@/lib/contexts/trial-status-context.tsx";
import useQrs from "@/lib/swr/use-qrs.ts";
import {
  ICheckoutFormError,
  ICheckoutFormSuccess,
} from "@/ui/checkout/interface";
import CheckoutFormComponent from "@/ui/checkout/primer-checkout";
import { FAQSection } from "@/ui/landing/components/faq-section/faq-section.tsx";
import { PlansFeatures } from "@/ui/plans/components/plans-features.tsx";
import { PlansHeading } from "@/ui/plans/components/plans-heading.tsx";
import { PopularQrInfo } from "@/ui/plans/components/popular-qr-info.tsx";
import { PricingPlanCard } from "@/ui/plans/components/pricing-plan-card.tsx";
import {
  IPricingPlan,
  MOCK_USER,
  PRICING_PLANS,
} from "@/ui/plans/constants.ts";
import { QRCodeDemoMap } from "@/ui/qr-builder/components/qr-code-demos/qr-code-demo-map.ts";
import { EQRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { parseQRData } from "@/ui/utils/qr-data-parser.ts";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { Flex, Heading, Text } from "@radix-ui/themes";
import { useMemo, useRef, useState } from "react";

export default function PlansContent() {
  const { qrs } = useQrs();
  const { isTrialOver } = useTrialStatus();
  const checkoutFormRef = useRef<HTMLDivElement>(null);

  const mostScannedQR = useMemo(() => {
    if (!qrs || qrs.length === 0) return null;

    return qrs.sort((a, b) => {
      const aScans = a.link?.clicks || 0;
      const bScans = b.link?.clicks || 0;
      return bScans - aScans;
    })[0];
  }, [qrs]);

  const qrCodeDemo = mostScannedQR?.qrType
    ? QRCodeDemoMap[mostScannedQR.qrType as EQRType]
    : QRCodeDemoMap[EQRType.WEBSITE];

  const demoProps = useMemo(() => {
    if (!mostScannedQR || !qrCodeDemo || !mostScannedQR.data) {
      return {};
    }

    return parseQRData(mostScannedQR.qrType as EQRType, mostScannedQR.data);
  }, [mostScannedQR, qrCodeDemo]);

  const [selectedPlan, setSelectedPlan] = useState<IPricingPlan>(
    PRICING_PLANS[0],
  );

  const handlePaymentSuccess = (data: ICheckoutFormSuccess) => {
    console.log("Payment successful:", data);
  };

  const handlePaymentError = (error: ICheckoutFormError) => {
    console.error("Payment failed:", error);
  };

  const totalCharge = selectedPlan.price * selectedPlan.duration;

  const handleScroll = () => {
    if (checkoutFormRef.current) {
      checkoutFormRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 lg:gap-8">
      <PlansHeading isTrialOver={isTrialOver} />

      <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
        <PopularQrInfo
          qrCodeDemo={qrCodeDemo}
          demoProps={demoProps}
          mostScannedQR={mostScannedQR}
          isTrialOver={isTrialOver}
          handleScroll={handleScroll}
        />

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
              onValueChange={(value) => {
                const plan = PRICING_PLANS.find((p) => p.id === value);
                if (plan) setSelectedPlan(plan);
              }}
              className="flex flex-col gap-2"
            >
              {PRICING_PLANS.map((plan) => (
                <PricingPlanCard
                  key={plan.id}
                  plan={plan}
                  isSelected={selectedPlan.id === plan.id}
                />
              ))}
            </RadioGroup.Root>

            <Text as="p" size="1" className="text-neutral-800">
              You'll be charged US${totalCharge.toFixed(2)} today. Renews every{" "}
              {selectedPlan.name.toLowerCase()}. Cancel anytime.
            </Text>

            <div ref={checkoutFormRef}>
              <CheckoutFormComponent
                locale="en"
                theme="light"
                user={MOCK_USER}
                paymentPlan={selectedPlan.paymentPlan}
                handleCheckoutSuccess={handlePaymentSuccess}
                handleCheckoutError={handlePaymentError}
                submitBtn={{
                  text: isTrialOver
                    ? `Subscribe to ${selectedPlan.name}`
                    : "Update plan",
                }}
              />
            </div>

            <Text as="p" size="1" className="text-center text-neutral-800">
              🔒 Secure payment • Cancel anytime • No hidden fees
            </Text>
          </div>
        </Flex>

        <div className="block pb-6 lg:hidden">
          <PlansFeatures />
        </div>
      </div>
      <FAQSection />
    </div>
  );
}
