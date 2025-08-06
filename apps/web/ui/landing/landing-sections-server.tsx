import { FAQ_ITEMS_HOMEPAGE } from "@/ui/landing/components/faq-section/config.tsx";
import { FAQSection } from "@/ui/landing/components/faq-section/faq-section.tsx";
import { GetQRFeaturesCardsSection } from "./components/get-qr-features-cards/get-qr-features.tsx";
import { GetQRInfoCardsSection } from "./components/get-qr-info-cards/get-qr-info.tsx";

export const LandingSectionsServer = () => {
  return (
    <>
      <GetQRInfoCardsSection />
      <GetQRFeaturesCardsSection />
      <FAQSection faqItems={FAQ_ITEMS_HOMEPAGE} />
    </>
  );
};
