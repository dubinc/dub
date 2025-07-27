"use client";

import { useTrialStatus } from "@/lib/contexts/trial-status-context.tsx";
import { FAQ_ITEMS_PAYWALL } from "@/ui/landing/components/faq-section/config.tsx";
import { FAQSection } from "@/ui/landing/components/faq-section/faq-section.tsx";
import { PaymentComponent } from "@/ui/plans/components/payment-component.tsx";
import { PlansFeatures } from "@/ui/plans/components/plans-features.tsx";
import { PlansHeading } from "@/ui/plans/components/plans-heading.tsx";
import { PopularQrInfo } from "@/ui/plans/components/popular-qr-info.tsx";
import { QRCodeDemoMap } from "@/ui/qr-builder/components/qr-code-demos/qr-code-demo-map.ts";
import {
  EQRType,
  FILE_QR_TYPES,
} from "@/ui/qr-builder/constants/get-qr-config.ts";
import { QrStorageData } from "@/ui/qr-builder/types/types.ts";
import { parseQRData } from "@/ui/utils/qr-data-parser.ts";
import { ICustomerBody } from "core/integration/payment/config";
import { Options } from "qr-code-styling/lib/types";
import { FC, useMemo, useRef } from "react";

interface IPlansContentProps {
  user: ICustomerBody;
  mostScannedQR: QrStorageData | null;
}

export const PlansContent: FC<Readonly<IPlansContentProps>> = ({
  user,
  mostScannedQR,
}) => {
  const { isTrialOver } = useTrialStatus();
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  const hasSubscription = !!user?.paymentInfo?.subscriptionId;

  const qrCodeDemo = mostScannedQR?.qrType
    ? QRCodeDemoMap[mostScannedQR.qrType as EQRType]
    : QRCodeDemoMap[EQRType.WEBSITE];

  const demoProps = useMemo(() => {
    if (!mostScannedQR || !qrCodeDemo || !mostScannedQR.data) return {};

    const qrType = mostScannedQR.qrType as EQRType;
    const stylesData = (mostScannedQR.styles as Options)?.data;

    if (FILE_QR_TYPES.includes(qrType)) {
      return parseQRData(qrType, mostScannedQR.link.url);
    }

    return parseQRData(qrType, stylesData || mostScannedQR.data);
  }, [mostScannedQR, qrCodeDemo]);

  const handleScrollToPayment = () => {
    if (paymentSectionRef.current) {
      paymentSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 lg:gap-8">
      <PlansHeading
        isTrialOver={isTrialOver}
        hasSubscription={hasSubscription}
      />

      <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
        <PopularQrInfo
          user={user}
          qrCodeDemo={qrCodeDemo}
          demoProps={demoProps}
          mostScannedQR={mostScannedQR}
          isTrialOver={isTrialOver}
          hasSubscription={hasSubscription}
          handleScroll={handleScrollToPayment}
        />

        <div ref={paymentSectionRef}>
          <PaymentComponent
            user={user}
            isTrialOver={isTrialOver}
            onScrollToPayment={handleScrollToPayment}
          />
        </div>

        <div className="block pb-6 lg:hidden">
          <PlansFeatures />
        </div>
      </div>

      <FAQSection faqItems={FAQ_ITEMS_PAYWALL} homePageDemo={false} />
    </div>
  );
};
