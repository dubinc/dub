"use client";

import { useTrialStatus } from "@/lib/contexts/trial-status-context.tsx";
import useQrs from "@/lib/swr/use-qrs.ts";
import { FAQ_ITEMS_PAYWALL } from "@/ui/landing/components/faq-section/config.ts";
import { FAQSection } from "@/ui/landing/components/faq-section/faq-section.tsx";
import { PaymentComponent } from "@/ui/plans/components/payment-component.tsx";
import { PlansFeatures } from "@/ui/plans/components/plans-features.tsx";
import { PlansHeading } from "@/ui/plans/components/plans-heading.tsx";
import { PopularQrInfo } from "@/ui/plans/components/popular-qr-info.tsx";
import { QRCodeDemoMap } from "@/ui/qr-builder/components/qr-code-demos/qr-code-demo-map.ts";
import { EQRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { parseQRData } from "@/ui/utils/qr-data-parser.ts";
import { ICustomerBody } from "core/integration/payment/config";
import { FC, useMemo, useRef } from "react";

interface IPlansContentProps {
  user: ICustomerBody;
}

const PlansContent: FC<Readonly<IPlansContentProps>> = ({ user }) => {
  const { qrs } = useQrs();
  const { isTrialOver } = useTrialStatus();
  const paymentSectionRef = useRef<HTMLDivElement>(null);

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
      <PlansHeading isTrialOver={isTrialOver} />

      <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
        <PopularQrInfo
          user={user}
          qrCodeDemo={qrCodeDemo}
          demoProps={demoProps}
          mostScannedQR={mostScannedQR}
          isTrialOver={isTrialOver}
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

      <FAQSection faqItems={FAQ_ITEMS_PAYWALL} />
    </div>
  );
};

export default PlansContent;
