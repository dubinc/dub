"use client";

import { FAQ_ITEMS_HOMEPAGE } from "@/ui/landing/components/faq-section/config.tsx";
import { FAQSection } from "@/ui/landing/components/faq-section/faq-section.tsx";
import { Footer } from "@/ui/landing/components/footer";
import { PricingSection } from "@/ui/landing/components/pricing/pricing-plans.tsx";
import { QrTabsDetailed } from "@/ui/landing/components/qr-tabs-detailed/qr-tabs-detailed.tsx";
import { LogoScrollingBanner } from "@/ui/landing/components/qr-tabs/components/logo-scrolling-banner.tsx";
import { ReviewsSection } from "@/ui/landing/components/reviews/reviews-section.tsx";
import { Rating } from "@/ui/qr-rating/rating";
import { EQRType } from "@/ui/qr-builder-new/constants/get-qr-config.ts";
import { useMediaQuery } from "@dub/ui";
import { CTASection } from "./components/cta-section/cta-section.tsx";
import { GetQRFeaturesCardsSection } from "./components/get-qr-features-cards/get-qr-features.tsx";
import { GetQRInfoCardsSection } from "./components/get-qr-info-cards/get-qr-info.tsx";

interface ILandingSectionsServerProps {
  sessionId: string;
  handleScrollButtonClick: (type: "1" | "2" | "3", scrollTo?: EQRType) => void;
  handleFeatureClick: (feature: string) => void;
  featureToOpen?: string | null;
}

export const LandingSectionsServer = ({
  sessionId,
  handleScrollButtonClick,
  handleFeatureClick,
  featureToOpen,
}: ILandingSectionsServerProps) => {
  const { isMobile } = useMediaQuery();

  return (
    <>
      {/* 2. Rating */}
      <Rating />

      {/* 3. GetQRInfoCardsSection */}
      <GetQRInfoCardsSection />

      {/* 4. QrTabsDetailed */}
      <QrTabsDetailed
        sessionId={sessionId}
        handleScrollButtonClick={handleScrollButtonClick}
      />

      {/* 5. GetQRFeaturesCardsSection */}
      <GetQRFeaturesCardsSection initialTab={featureToOpen || undefined} />

      {/* 6. Reviews */}
      <ReviewsSection />

      {/* 7. Pricing (keep in same place) */}
      <PricingSection handleScrollButtonClick={handleScrollButtonClick} />

      {/* 7.5. Scrolling Banner */}
      {!isMobile && <LogoScrollingBanner />}

      {/* 8. CTA */}
      <CTASection handleScrollButtonClick={handleScrollButtonClick} />

      {/* 9. FAQ */}
      <FAQSection faqItems={FAQ_ITEMS_HOMEPAGE} />

      {/* 10. Footer */}
      <Footer 
        sessionId={sessionId} 
        handleScrollButtonClick={handleScrollButtonClick}
        handleFeatureClick={handleFeatureClick}
      />
    </>
  );
};
