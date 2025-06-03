"use client";

import { useTrialStatus } from "@/lib/contexts/trial-status-context.tsx";
import useQrs from "@/lib/swr/use-qrs.ts";
import {
  ICheckoutFormError,
  ICheckoutFormSuccess,
} from "@/ui/checkout/interface";
import CheckoutFormComponent from "@/ui/checkout/primer-checkout";
import { PlansFeatures } from "@/ui/plans/components/plans-features.tsx";
import { PlansHeading } from "@/ui/plans/components/plans-heading.tsx";
import { PopularQrInfo } from "@/ui/plans/components/popular-qr-info.tsx";
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
          className="border-border-500 gap-4 rounded-lg border p-3 lg:flex-1 lg:gap-[18px] lg:px-6 lg:py-4"
        >
          <Heading
            as="h2"
            align={{ initial: "center", lg: "left" }}
            size={{ initial: "3", lg: "4" }}
            className="text-neutral"
          >
            Choose Your Plan
          </Heading>

          <div className="border-border-500 h-px w-full border-t" />

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
                <label
                  key={plan.id}
                  className={`flex cursor-pointer flex-row items-center gap-3 rounded-lg border p-3 lg:gap-3.5 lg:px-6 lg:py-3.5 ${
                    selectedPlan.id === plan.id
                      ? "border-secondary bg-background"
                      : "border-border-500"
                  }`}
                >
                  <RadioGroup.Item
                    value={plan.id}
                    className="data-[state=checked]:border-secondary relative h-[18px] w-[18px] flex-shrink-0 rounded-full border-2 border-neutral-200 outline-none focus:ring-0 lg:h-[22px] lg:w-[22px]"
                  >
                    <RadioGroup.Indicator className="flex h-full w-full items-center justify-center">
                      <div className="bg-secondary absolute bottom-[22.73%] left-[22.73%] right-[22.73%] top-[22.73%] rounded-full" />
                    </RadioGroup.Indicator>
                  </RadioGroup.Item>

                  <div className="flex w-full flex-row items-center justify-between lg:hidden">
                    <Flex direction="column">
                      <Flex direction="row" align="center" gap="2">
                        <Text
                          as="span"
                          weight="bold"
                          className="text-neutral text-[13px]"
                        >
                          {plan.name}
                        </Text>
                        {plan.savings && (
                          <Flex
                            align="center"
                            justify="center"
                            className="border-secondary rounded-[60px] border bg-[rgba(0,122,255,0.04)] px-2 py-1"
                          >
                            <Text
                              as="span"
                              className="text-secondary text-[10px] font-medium"
                            >
                              {plan.savings}
                            </Text>
                          </Flex>
                        )}
                      </Flex>
                      <Text as="span" className="text-[10px] text-neutral-800">
                        {plan.description}
                      </Text>
                    </Flex>

                    <Flex direction="column" align="end">
                      <Flex
                        direction="row"
                        align={{ initial: "center", lg: "end" }}
                        gap="1"
                      >
                        <Text
                          as="span"
                          weight="bold"
                          className="text-neutral text-[13px]"
                        >
                          US ${plan.price.toFixed(2)}
                        </Text>
                        <Text
                          as="span"
                          className="text-[10px] text-neutral-800 lg:text-xs"
                        >
                          /month
                        </Text>
                      </Flex>
                      {plan.originalPrice && (
                        <Text
                          as="span"
                          className="text-[10px] text-neutral-800 line-through lg:text-xs"
                        >
                          ${plan.originalPrice.toFixed(2)}
                        </Text>
                      )}
                    </Flex>
                  </div>

                  <div className="hidden lg:flex lg:min-w-0 lg:flex-1 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
                    <div className="flex flex-row items-center gap-4">
                      <div className="flex w-[140px] flex-shrink-0 flex-col justify-center gap-px">
                        <span className="text-neutral whitespace-nowrap text-sm font-semibold">
                          {plan.name}
                        </span>
                        <span className="whitespace-nowrap text-xs text-neutral-800">
                          {plan.description}
                        </span>
                      </div>

                      <div className="flex w-[100px] justify-center">
                        {plan.savings && (
                          <div className="border-secondary flex flex-shrink-0 items-center justify-center rounded-[60px] border bg-[rgba(0,122,255,0.04)] px-3 py-1">
                            <span className="text-secondary whitespace-nowrap text-sm font-medium leading-5">
                              {plan.savings}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-shrink-0 flex-col items-end justify-center gap-px">
                      <div className="flex flex-row items-center gap-1">
                        <span className="text-neutral whitespace-nowrap text-sm font-semibold">
                          US ${plan.price.toFixed(2)}
                        </span>
                        <span className="whitespace-nowrap text-xs text-neutral-800">
                          /month
                        </span>
                      </div>
                      {plan.originalPrice && (
                        <span className="whitespace-nowrap text-xs text-neutral-800 line-through">
                          ${plan.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </RadioGroup.Root>

            <Text as="p" className="text-[10px] text-neutral-800 lg:text-xs">
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
                  text: `Subscribe to ${selectedPlan.name}`,
                }}
              />
            </div>

            <Text
              as="p"
              className="text-center text-[10px] text-neutral-800 lg:text-xs"
            >
              🔒 Secure payment • Cancel anytime • No hidden fees
            </Text>
          </div>
        </Flex>

        <div className="block pb-6 lg:hidden">
          <PlansFeatures />
        </div>
      </div>
    </div>
  );
}
