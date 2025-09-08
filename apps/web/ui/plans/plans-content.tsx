"use client";

import { FeaturesAccess } from "@/lib/actions/check-features-access-auth-less";
import { FAQ_ITEMS_PAYWALL } from "@/ui/landing/components/faq-section/config.tsx";
import { FAQSection } from "@/ui/landing/components/faq-section/faq-section.tsx";
import { PaymentComponent } from "@/ui/plans/components/payment-component.tsx";
import { PlansFeatures } from "@/ui/plans/components/plans-features.tsx";
import { PlansHeading } from "@/ui/plans/components/plans-heading.tsx";
import { PopularQrInfo } from "@/ui/plans/components/popular-qr-info.tsx";
import { ICustomerBody } from "core/integration/payment/config";
import { FC, useRef } from "react";

interface IPlansContentProps {
  mostScannedQR: QrStorageData | null;
  user: ICustomerBody;
  featuresAccess: FeaturesAccess;
}

export const PlansContent: FC<Readonly<IPlansContentProps>> = ({
  mostScannedQR = null,
  user,
  featuresAccess,
}) => {
  const paymentSectionRef = useRef<HTMLDivElement>(null);

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
      <PlansHeading featuresAccess={featuresAccess} />

      <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
        <PopularQrInfo
          mostScannedQR={qr}
          featuresAccess={featuresAccess}
          handleScroll={handleScrollToPayment}
        />

        <div ref={paymentSectionRef}>
          <PaymentComponent
            user={user}
            featuresAccess={featuresAccess}
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
