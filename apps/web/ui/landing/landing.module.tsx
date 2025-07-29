"use client";

import { FAQ_ITEMS_HOMEPAGE } from "@/ui/landing/components/faq-section/config.tsx";
import { FAQSection } from "@/ui/landing/components/faq-section/faq-section.tsx";
import { PricingSection } from "@/ui/landing/components/pricing/pricing-plans.tsx";
import { ReviewsSection } from "@/ui/landing/components/reviews/reviews-section.tsx";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface.ts";
import { FC, useRef } from "react";
import { GetQRFeaturesCardsSection } from "./components/get-qr-features-cards/get-qr-features.tsx";
import { GetQRInfoCardsSection } from "./components/get-qr-info-cards/get-qr-info.tsx";
import { QrTabsDetailed } from "./components/qr-tabs-detailed/qr-tabs-detailed.tsx";
import { QRTabs } from "./components/qr-tabs/qr-tabs.tsx";

interface ILandingModuleProps {
  sessionId: string;
}

export const LandingModule: FC<Readonly<ILandingModuleProps>> = ({
  sessionId,
}) => {
  const qrGenerationBlockRef = useRef<HTMLDivElement>(null);

  const handleScrollButtonClick = (type: "1" | "2") => {
    trackClientEvents({
      event: EAnalyticEvents.PAGE_CLICKED,
      params: {
        page_name: "landing",
        content_value: "create_qr",
        element_no: type,
        event_category: "nonAuthorized",
      },
      sessionId,
    });

    qrGenerationBlockRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <main className="relative mx-auto min-h-screen w-full pb-6 md:pb-12">
      <QRTabs ref={qrGenerationBlockRef} sessionId={sessionId} />
      <GetQRInfoCardsSection />
      <QrTabsDetailed
        sessionId={sessionId}
        handleScrollButtonClick={handleScrollButtonClick}
      />
      <GetQRFeaturesCardsSection />
      <ReviewsSection />
      <PricingSection handleScrollButtonClick={handleScrollButtonClick} />
      <FAQSection faqItems={FAQ_ITEMS_HOMEPAGE} />
    </main>
  );
};
