"use client";

import { useTrialStatus } from "@/lib/contexts/trial-status-context.tsx";
import useQrs from "@/lib/swr/use-qrs.ts";
import { FAQSection } from "@/ui/landing/components/faq-section/faq-section.tsx";
import { PlansFeatures } from "@/ui/plans/components/plans-features.tsx";
import { PlansHeading } from "@/ui/plans/components/plans-heading.tsx";
import { PopularQrInfo } from "@/ui/plans/components/popular-qr-info.tsx";
import { PricingPlanCard } from "@/ui/plans/components/pricing-plan-card.tsx";
import { IPricingPlan, PRICING_PLANS } from "@/ui/plans/constants.ts";
import { QRCodeDemoMap } from "@/ui/qr-builder/components/qr-code-demos/qr-code-demo-map.ts";
import { EQRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { parseQRData } from "@/ui/utils/qr-data-parser.ts";
import { LoadingSpinner, Modal } from "@dub/ui";
import { Payment } from "@primer-io/checkout-web";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { Flex, Heading, Text } from "@radix-ui/themes";
import { useCreateSubscriptionMutation } from "core/api/user/subscription/subscription.hook.tsx";
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
import { FC, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidV4 } from "uuid";

interface IPlansContentProps {
  cookieUser: ICustomerBody;
  reloadUserCookie: () => void;
}

const PlansContent: FC<Readonly<IPlansContentProps>> = ({
  cookieUser,
  reloadUserCookie,
}) => {
  const { qrs } = useQrs();
  const { isTrialOver } = useTrialStatus();
  const checkoutFormRef = useRef<HTMLDivElement>(null);
  const [isUpdatingToken, setIsUpdatingToken] = useState(false);

  const [isSubscriptionCreation, setIsSubscriptionCreation] = useState(false);
  const { trigger: triggerCreateSubscription } =
    useCreateSubscriptionMutation();

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

  const handlePaymentSuccess = async (data: ICheckoutFormSuccess) => {
    console.log("Payment successful:", data);

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
    }

    toast.success("Subscription created successfully!");
  };

  const handleCheckoutError = ({
    error,
    data,
  }: {
    error: IPrimerClientError;
    data: { payment?: Payment };
  }) => {
    console.error("Payment failed:", error);
  };

  const { priceForView: totalPriceForView } = getPaymentPlanPrice({
    paymentPlan: selectedPlan.paymentPlan,
    user: cookieUser,
  });
  const totalChargePrice = getCalculatePriceForView(
    totalPriceForView,
    cookieUser,
  );

  const handleScroll = () => {
    if (checkoutFormRef.current) {
      checkoutFormRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
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
      updateClientToken(plan);
    }
  };

  const checkoutKey = useMemo(() => {
    return `${selectedPlan.id}-${cookieUser.paymentInfo?.clientToken?.slice(0, 10) || "no-token"}`;
  }, [selectedPlan.id, cookieUser.paymentInfo?.clientToken]);

  return (
    <>
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

              <div ref={checkoutFormRef}>
                {!isUpdatingToken && (
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
                {isUpdatingToken && (
                  <div className="flex items-center justify-center py-4">
                    <Text size="2" className="text-neutral-600">
                      Updating payment information...
                    </Text>
                  </div>
                )}
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

      <Modal showModal={isSubscriptionCreation} preventDefaultClose>
        <div className="flex flex-col items-center gap-2 p-4">
          <span className="text-lg font-semibold">
            Your Order Is Being Processed
          </span>
          <LoadingSpinner />
          <span>
            Please wait while we finalize your payment and create your digital
            product. Closing this tab may interrupt the process.
          </span>
        </div>
      </Modal>
    </>
  );
};

export default PlansContent;
