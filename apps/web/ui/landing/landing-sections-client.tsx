"use client";

import { PricingSection } from "@/ui/landing/components/pricing/pricing-plans.tsx";
import { QrTabsDetailed } from "@/ui/landing/components/qr-tabs-detailed/qr-tabs-detailed.tsx";
import { QRTabs } from "@/ui/landing/components/qr-tabs/qr-tabs.tsx";
import { ReviewsSection } from "@/ui/landing/components/reviews/reviews-section.tsx";
import { FC, useRef } from "react";
import { trackClientEvents } from "../../core/integration/analytic";
import { EAnalyticEvents } from "../../core/integration/analytic/interfaces/analytic.interface.ts";

interface ILandingSectionsClientProps {
  sessionId: string;
}

export const LandingSectionsClient: FC<
  Readonly<ILandingSectionsClientProps>
> = ({ sessionId }) => {
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
    <>
      <section
        ref={qrGenerationBlockRef}
        className="bg-primary-100 w-full px-3 py-10 lg:py-14"
      >
        <QRTabs sessionId={sessionId} />
      </section>

      <QrTabsDetailed
        sessionId={sessionId}
        handleScrollButtonClick={handleScrollButtonClick}
      />
      <ReviewsSection />
      <PricingSection handleScrollButtonClick={handleScrollButtonClick} />
    </>
  );
};
