import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useUser } from "@/ui/contexts/user";
import { cn } from "@dub/utils";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface.ts";
import { FC, useCallback } from "react";

import { QR_STYLES_OPTIONS } from "../../constants/customization/qr-styles-options";
import {
  IFrameData,
  ILogoData,
  IQRCustomizationData,
  IShapeData,
  IStyleData,
} from "../../types/customization";
import { FrameSelector } from "./frame-selector";
import { LogoSelector } from "./logo-selector";
import { ShapeSelector } from "./shape-selector";
import { StyleSelector } from "./style-selector";

interface QRCustomizationProps {
  customizationData: IQRCustomizationData;
  onCustomizationChange: (data: IQRCustomizationData) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  disabled?: boolean;
  isMobile?: boolean;
  homepageDemo?: boolean;
}

export const QRCustomization: FC<QRCustomizationProps> = ({
  customizationData,
  onCustomizationChange,
  activeTab,
  onTabChange,
  disabled = false,
  isMobile = false,
  homepageDemo = false,
}) => {
  const user = useUser();

  const isFrameSelected = customizationData.frame.id !== "frame-none";

  const handleAccordionChange = useCallback(
    (value: string) => {
      onTabChange(value);

      if (value) {
        trackClientEvents({
          event: EAnalyticEvents.ELEMENT_CLICKED,
          params: {
            page_name: homepageDemo ? "landing" : "dashboard",
            element_name: "customization_accordion",
            content_value: value.toLowerCase(),
            email: user?.email,
            event_category: homepageDemo ? "nonAuthorized" : "Authorized",
          },
          sessionId: user?.id,
        });
      }
    },
    [onTabChange, homepageDemo, user],
  );

  const handleFrameChange = useCallback(
    (frameData: IFrameData) => {
      const updatedData = {
        ...customizationData,
        frame: frameData,
      };
      onCustomizationChange(updatedData);
    },
    [customizationData, onCustomizationChange],
  );

  const handleStyleChange = useCallback(
    (styleData: IStyleData) => {
      onCustomizationChange({
        ...customizationData,
        style: styleData,
      });
    },
    [customizationData, onCustomizationChange],
  );

  const handleShapeChange = useCallback(
    (shapeData: IShapeData) => {
      onCustomizationChange({
        ...customizationData,
        shape: shapeData,
      });
    },
    [customizationData, onCustomizationChange],
  );

  const handleLogoChange = useCallback(
    (logoData: ILogoData) => {
      const updatedData = {
        ...customizationData,
        logo: logoData,
      };
      onCustomizationChange(updatedData);
    },
    [customizationData, onCustomizationChange],
  );

  const frameSelector = (
    <FrameSelector
      frameData={customizationData.frame}
      onFrameChange={handleFrameChange}
      disabled={disabled}
      isMobile={isMobile}
    />
  );

  const styleShapeSelector = (
    <div className="flex flex-col gap-6">
      <StyleSelector
        styleData={customizationData.style}
        onStyleChange={handleStyleChange}
        frameSelected={isFrameSelected}
        disabled={disabled}
        isMobile={isMobile}
      />
      <ShapeSelector
        shapeData={customizationData.shape}
        onShapeChange={handleShapeChange}
        disabled={disabled}
        isMobile={isMobile}
      />
    </div>
  );

  const logoSelector = (
    <LogoSelector
      logoData={customizationData.logo}
      onLogoChange={handleLogoChange}
      disabled={disabled}
      isMobile={isMobile}
    />
  );

  return (
    <Accordion
      type="single"
      collapsible
      value={activeTab}
      onValueChange={handleAccordionChange}
      className="w-full space-y-2"
    >
      {QR_STYLES_OPTIONS.map((tab) => {
        const selectorContent =
          tab.id === "frame" ? frameSelector :
          tab.id === "style-shape" ? styleShapeSelector :
          tab.id === "logo" ? logoSelector : null;

        const Icon = tab.icon;

        return (
          <AccordionItem
            key={tab.id}
            value={tab.label}
            className="border-none rounded-[20px] px-4 bg-[#fbfbfb]"
            disabled={disabled}
          >
            <AccordionTrigger
              className={cn(
                "hover:no-underline",
                {
                  "cursor-not-allowed opacity-50": disabled,
                },
              )}
            >
              <div className="flex items-start gap-3 text-left">
                <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-secondary/10">
                  <Icon className="h-5 w-5 text-secondary" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-foreground text-base font-medium">
                    {tab.label}
                  </span>
                  <span className="text-muted-foreground text-sm font-normal">
                    {tab.description}
                  </span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 ">
              {selectorContent}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};
