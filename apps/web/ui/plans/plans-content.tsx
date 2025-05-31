"use client";

import { useTrialStatus } from "@/lib/contexts/trial-status-context.tsx";
import useQrs from "@/lib/swr/use-qrs.ts";
import {
  ICheckoutFormError,
  ICheckoutFormSuccess,
} from "@/ui/checkout/interface";
import CheckoutFormComponent from "@/ui/checkout/primer-checkout";
import { QRCodeDemoMap } from "@/ui/qr-builder/components/qr-code-demos/qr-code-demo-map.ts";
import { EQRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { parseQRData } from "@/ui/utils/qr-data-parser.ts";
import { cn } from "@dub/utils/src";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ICustomerBody,
  TPaymentPlan,
} from "../../core/integration/payment/config.ts";

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  description: string;
  paymentPlan: TPaymentPlan;
  savings?: string;
  originalPrice?: number;
}

const pricingPlans: PricingPlan[] = [
  {
    id: "annual",
    name: "12 months",
    price: 19.99,
    currency: "USD",
    interval: "month",
    description: "Billed annually",
    paymentPlan: "ANNUAL",
    savings: "50% SAVE",
    originalPrice: 39.99,
  },
  {
    id: "semester",
    name: "6 months",
    price: 29.99,
    currency: "USD",
    interval: "month",
    description: "Billed every semester",
    paymentPlan: "SEMESTER",
    savings: "25% SAVE",
    originalPrice: 39.99,
  },
  {
    id: "quarterly",
    name: "3 months",
    price: 39.99,
    currency: "USD",
    interval: "month",
    description: "Billed quarterly",
    paymentPlan: "QUARTERLY",
  },
];

// Mock user data
const mockUser: ICustomerBody = {
  id: "7553ae74-e2a5-47fd-818c-91fe314a65e2",
  email: "user@example.com",
  paymentInfo: {
    clientToken:
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsImtpZCI6ImNsaWVudC10b2tlbi1zaWduaW5nLWtleSJ9.eyJleHAiOjE3NDg2MzIwNDgsImFjY2Vzc1Rva2VuIjoiZDZhMzBiNTEtMzUxNy00MmIwLWI2MjctNTE3YzdiMjMwNjUyIiwiYW5hbHl0aWNzVXJsIjoiaHR0cHM6Ly9hbmFseXRpY3MuYXBpLnNhbmRib3guY29yZS5wcmltZXIuaW8vbWl4cGFuZWwiLCJhbmFseXRpY3NVcmxWMiI6Imh0dHBzOi8vYW5hbHl0aWNzLnNhbmRib3guZGF0YS5wcmltZXIuaW8vY2hlY2tvdXQvdHJhY2siLCJpbnRlbnQiOiJDSEVDS09VVCIsImNvbmZpZ3VyYXRpb25VcmwiOiJodHRwczovL2FwaS5zYW5kYm94LnByaW1lci5pby9jbGllbnQtc2RrL2NvbmZpZ3VyYXRpb24iLCJjb3JlVXJsIjoiaHR0cHM6Ly9hcGkuc2FuZGJveC5wcmltZXIuaW8iLCJwY2lVcmwiOiJodHRwczovL3Nkay5hcGkuc2FuZGJveC5wcmltZXIuaW8iLCJlbnYiOiJTQU5EQk9YIiwicGF5bWVudEZsb3ciOiJERUZBVUxUIn0.1gEld_tr6ZXi4AS7sV_HDHzymsKTMmOCGXjjsi7jFyw",
  },
  currency: {
    currencyCard: "USD",
    currencyPaypal: "USD",
    currencyWallet: "USD",
    countryCode: "US",
  },
};

const features = [
  "Unlimited dynamic QR",
  "Variety of QR types",
  "Editing and management of QR codes",
  "Unlimited scans",
  "Complete QR analytics",
];

const capitalizeFirstLetter = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export default function PlansContent() {
  const { qrs } = useQrs();
  const { isTrialOver } = useTrialStatus();

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

  const [selectedPlan, setSelectedPlan] = useState<PricingPlan>(
    pricingPlans[0],
  );

  const handlePaymentSuccess = (data: ICheckoutFormSuccess) => {
    console.log("Payment successful:", data);
  };

  const handlePaymentError = (error: ICheckoutFormError) => {
    console.error("Payment failed:", error);
  };

  return (
    <div className="flex w-full flex-col items-center justify-center gap-8">
      <h1 className="text-neutral mb-2 text-center text-2xl font-semibold">
        {isTrialOver ? "Your free trial has ended" : "Upgrade your plan"}
      </h1>
      <div className="flex w-full flex-row items-start gap-8">
        <div className="border-border-500 flex flex-1 flex-col rounded-xl border p-6">
          <h2 className="text-neutral mb-4 text-xl font-medium leading-6 tracking-[0.02em]">
            Subscribe to the plan that best suits your needs
          </h2>

          <div className="border-border-200 mb-4 h-px w-full border-t" />

          <div className="mb-4 flex flex-row items-start gap-4 md:gap-6 [&_svg:first-child]:h-[240px] [&_svg:first-child]:w-[184px]">
            <qrCodeDemo.Component {...demoProps} />

            <div className="flex flex-1 flex-col justify-center gap-3 rounded-lg">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-neutral-800">
                  Your QR Code Name
                </span>
                <span className="text-neutral text-sm font-semibold">
                  {mostScannedQR?.title || mostScannedQR?.title || "web-1"}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-sm text-neutral-800">Type</span>
                <span className="text-neutral text-sm font-semibold">
                  {capitalizeFirstLetter(mostScannedQR?.qrType || "website")}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-sm text-neutral-800">
                  Number of scans
                </span>
                <span className="text-neutral text-sm font-semibold">
                  {(mostScannedQR && mostScannedQR.link?.clicks) || 231}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-sm text-neutral-800">Status</span>
                <div
                  className={cn(
                    "bg-primary-100 inline-flex w-fit min-w-[64px] items-center justify-center rounded-md border border-neutral-200/10 p-0.5 px-1",
                    {
                      "bg-red-100": isTrialOver,
                    },
                  )}
                >
                  <span
                    className={cn("text-primary text-sm font-medium", {
                      "text-red-600": isTrialOver,
                    })}
                  >
                    {isTrialOver ? "Deactivated" : "Active"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary-200 flex flex-col items-center justify-center gap-3 rounded-lg p-3.5">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex w-full flex-row items-center gap-1.5"
              >
                <Check
                  className="text-primary h-[18px] w-[18px]"
                  strokeWidth={2}
                />
                <span className="text-neutral text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-border-500 flex flex-1 flex-col rounded-lg border p-6">
          <h2 className="text-neutral mb-4 text-xl font-medium leading-6 tracking-[0.02em]">
            Get QR subscribe
          </h2>

          <div className="border-border-500 mb-[18px] h-px w-full border-t" />

          <div className="flex flex-col justify-center gap-4">
            <RadioGroup.Root
              value={selectedPlan.id}
              onValueChange={(value) => {
                const plan = pricingPlans.find((p) => p.id === value);
                if (plan) setSelectedPlan(plan);
              }}
              className="flex flex-col gap-3"
            >
              {pricingPlans.map((plan) => (
                <label
                  key={plan.id}
                  className={`flex cursor-pointer flex-row items-center gap-3.5 rounded-lg border px-6 py-3.5 ${
                    selectedPlan.id === plan.id
                      ? "border-secondary bg-[#F5FAFF]"
                      : "border-border-500"
                  }`}
                >
                  <RadioGroup.Item
                    value={plan.id}
                    className="data-[state=checked]:border-secondary relative h-[22px] w-[22px] flex-shrink-0 rounded-full border-2 border-neutral-200 outline-none focus:ring-0"
                  >
                    <RadioGroup.Indicator className="flex h-full w-full items-center justify-center">
                      <div className="bg-secondary absolute bottom-[22.73%] left-[22.73%] right-[22.73%] top-[22.73%] rounded-full" />
                    </RadioGroup.Indicator>
                  </RadioGroup.Item>

                  <div className="flex min-w-0 flex-1 flex-row items-center justify-between gap-4">
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

            <p className="text-xs text-neutral-800">
              Renews at US$ {selectedPlan.price.toFixed(2)} for{" "}
              {selectedPlan.name.toLowerCase()}. Cancel anytime.
            </p>

            <div className="mt-4">
              <CheckoutFormComponent
                locale="en"
                theme="light"
                user={mockUser}
                paymentPlan={selectedPlan.paymentPlan}
                handleCheckoutSuccess={handlePaymentSuccess}
                handleCheckoutError={handlePaymentError}
                submitBtn={{
                  text: `Subscribe to ${selectedPlan.name}`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
