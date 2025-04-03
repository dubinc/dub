"use client";

import { FAQSection } from "@/ui/landing/faq-section/faq-section.tsx";
import { GetQRFeaturesCardsSection } from "./components/get-qr-features-cards/get-qr-features.tsx";
import { GetQRInfoCardsSection } from "./components/get-qr-info-cards/get-qr-info.tsx";
import { QrTabsDetailed } from "./components/qr-tabs-detailed/qr-tabs-detailed.tsx";
import { QRTabs } from "./components/qr-tabs/qr-tabs.tsx";
import { RatingInfoSection } from "./components/rating-info/rating-info-section.tsx";
import { ReviewsSection } from "./components/reviews/reviews-section.tsx";

export default function LandingPage() {
  return (
    <main className="relative mx-auto min-h-screen w-full py-6 md:py-[42px]">
      <QRTabs />
      <GetQRInfoCardsSection />
      <RatingInfoSection />
      <QrTabsDetailed />
      <GetQRFeaturesCardsSection />
      <ReviewsSection />
      <FAQSection />
    </main>
  );
}
