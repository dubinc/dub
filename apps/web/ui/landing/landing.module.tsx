"use client";

import { FAQSection } from "@/ui/landing/components/faq-section/faq-section.tsx";
import { useRef } from "react";
import { GetQRFeaturesCardsSection } from "./components/get-qr-features-cards/get-qr-features.tsx";
import { GetQRInfoCardsSection } from "./components/get-qr-info-cards/get-qr-info.tsx";
import { QrTabsDetailed } from "./components/qr-tabs-detailed/qr-tabs-detailed.tsx";
import { QRTabs } from "./components/qr-tabs/qr-tabs.tsx";
import { RatingInfoSection } from "./components/rating-info/rating-info-section.tsx";

export const LandingModule = () => {
  const qrGenerationBlockRef = useRef<HTMLDivElement>(null);

  const scrollToQRGenerationBlock = () => {
    qrGenerationBlockRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <main className="relative mx-auto min-h-screen w-full py-6 md:py-12">
      <QRTabs ref={qrGenerationBlockRef} />
      <GetQRInfoCardsSection />
      <RatingInfoSection
        scrollToQRGenerationBlock={scrollToQRGenerationBlock}
      />
      <QrTabsDetailed scrollToQRGenerationBlock={scrollToQRGenerationBlock} />
      <GetQRFeaturesCardsSection />
      {/*<ReviewsSection />*/}
      <FAQSection />
    </main>
  );
};
