"use client";

import { FAQSection } from "@/ui/landing/faq-section/faq-section.tsx";
import { useMediaQuery } from "@dub/ui";
import { useEffect, useState } from "react";
import { GetQRFeaturesCardsSection } from "./components/get-qr-features-cards/get-qr-features.tsx";
import { GetQRInfoCardsSection } from "./components/get-qr-info-cards/get-qr-info.tsx";
import { QrTabsDetailed } from "./components/qr-tabs-detailed/qr-tabs-detailed.tsx";
import { QRTabs } from "./components/qr-tabs/qr-tabs.tsx";
import { RatingInfoSection } from "./components/rating-info/rating-info-section.tsx";

export default function LandingPage() {
  const [isClient, setIsClient] = useState<boolean>(false); // Fix Hydration Mismatch according to https://nextjs.org/docs/messages/react-hydration-error
  const { isMobile } = useMediaQuery();

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <main className="relative mx-auto min-h-screen w-full py-6 md:py-[42px]">
      {isClient && (
        <>
          <QRTabs isMobile={isMobile} />
          <GetQRInfoCardsSection />
          {!isMobile && <RatingInfoSection />}
          <QrTabsDetailed isMobile={isMobile} />
          <GetQRFeaturesCardsSection />
          <FAQSection isMobile={isMobile} />
        </>
      )}
    </main>
  );
}
