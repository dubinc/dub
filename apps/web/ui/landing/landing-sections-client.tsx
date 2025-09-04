"use client";

import { PricingSection } from "@/ui/landing/components/pricing/pricing-plans.tsx";
import { QrTabsDetailed } from "@/ui/landing/components/qr-tabs-detailed/qr-tabs-detailed.tsx";
import { QRTabs } from "@/ui/landing/components/qr-tabs/qr-tabs.tsx";
import { ReviewsSection } from "@/ui/landing/components/reviews/reviews-section.tsx";
import { FC, useCallback, useRef, useState } from "react";
import { trackClientEvents } from "../../core/integration/analytic";
import { EAnalyticEvents } from "../../core/integration/analytic/interfaces/analytic.interface.ts";
import { EQRType } from '../qr-builder/constants/get-qr-config.ts';

interface ILandingSectionsClientProps {
  sessionId: string;
}

export const LandingSectionsClient: FC<
  Readonly<ILandingSectionsClientProps>
> = ({ sessionId }) => {
  const qrGenerationBlockRef = useRef<HTMLDivElement>(null);
  const [typeToScrollTo, setTypeToScrollTo] = useState<EQRType | null>(null);

  const handleScrollButtonClick = (type: "1" | "2", scrollTo?: EQRType) => {
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

    setTypeToScrollTo(scrollTo || null);

    qrGenerationBlockRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleResetTypeToScrollTo = useCallback(() => {
    setTypeToScrollTo(null);
  }, []);

  return (
    <>
      <section
        id="qr-generation-block"
        ref={qrGenerationBlockRef}
        className="bg-primary-100 w-full px-3 py-10 lg:py-14"
      >
        <QRTabs
          sessionId={sessionId}
          typeToScrollTo={typeToScrollTo}
          handleResetTypeToScrollTo={handleResetTypeToScrollTo}
        />
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
