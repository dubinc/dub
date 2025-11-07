"use client";

import { QRTabs } from "@/ui/landing/components/qr-tabs/qr-tabs.tsx";
import { LandingSectionsServer } from "@/ui/landing/landing-sections-server.tsx";
import { FC, useCallback, useRef, useState } from "react";
import { trackClientEvents } from "../../core/integration/analytic";
import { EAnalyticEvents } from "../../core/integration/analytic/interfaces/analytic.interface.ts";
import { EQRType } from "../qr-builder/constants/get-qr-config.ts";
import { scrollToBuilder } from './helpers/scrollToBuilder.tsx';

interface ILandingSectionsClientProps {
  sessionId: string;
}

export const LandingSectionsClient: FC<
  Readonly<ILandingSectionsClientProps>
> = ({ sessionId }) => {
  const [typeToScrollTo, setTypeToScrollTo] = useState<EQRType | null>(null);
  const [featureToOpen, setFeatureToOpen] = useState<string | null>(null);

  const handleScrollButtonClick = (
    type: "1" | "2" | "3",
    scrollTo?: EQRType,
  ) => {
    trackClientEvents({
      event: EAnalyticEvents.PAGE_CLICKED,
      params: {
        page_name: "landing",
        content_value: "create_qr",
        content_group: scrollTo ? scrollTo : null,
        element_no: type,
        event_category: "nonAuthorized",
      },
      sessionId,
    });

    setTypeToScrollTo(scrollTo || null);
    
    setTimeout(scrollToBuilder);
  };

  const handleFeatureClick = useCallback((feature: string) => {
    setFeatureToOpen(feature);
    const featuresSection = document.getElementById("features");
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleResetTypeToScrollTo = useCallback(() => {
    setTypeToScrollTo(null);
  }, []);

  return (
    <>
      {/* 1. New Builder */}
      <section
        id="qr-generation-block"
        className="bg-primary-100 w-full px-3 py-6 lg:py-14 min-h-[100svh] md:min-h-0 flex items-center justify-center"
      >
        <QRTabs
          sessionId={sessionId}
          typeToScrollTo={typeToScrollTo}
          handleResetTypeToScrollTo={handleResetTypeToScrollTo}
        />
      </section>

      {/* 2-8. Other sections */}
      <LandingSectionsServer
        sessionId={sessionId}
        handleScrollButtonClick={handleScrollButtonClick}
        handleFeatureClick={handleFeatureClick}
        featureToOpen={featureToOpen}
      />
    </>
  );
};
