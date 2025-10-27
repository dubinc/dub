"use client";

import { QRTabs } from "@/ui/landing/components/qr-tabs/qr-tabs.tsx";
import { LandingSectionsServer } from "@/ui/landing/landing-sections-server.tsx";
import { FC, useCallback, useRef, useState } from "react";
import { trackClientEvents } from "../../core/integration/analytic";
import { EAnalyticEvents } from "../../core/integration/analytic/interfaces/analytic.interface.ts";
import { EQRType } from "../qr-builder/constants/get-qr-config.ts";

interface ILandingSectionsClientProps {
  sessionId: string;
}

export const LandingSectionsClient: FC<
  Readonly<ILandingSectionsClientProps>
> = ({ sessionId }) => {
  const qrGenerationBlockRef = useRef<HTMLDivElement>(null);
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

    qrGenerationBlockRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
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
        ref={qrGenerationBlockRef}
        className="bg-primary-100 w-full px-3 py-10 lg:py-14"
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
