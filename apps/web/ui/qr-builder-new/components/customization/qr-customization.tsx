import { cn } from "@dub/utils";
import * as Tabs from "@radix-ui/react-tabs";
import { FC, useCallback } from "react";

import { QR_STYLES_OPTIONS } from "../../constants/customization/qr-styles-options";
import { 
  QRCustomizationData, 
  FrameData, 
  StyleData, 
  ShapeData, 
  LogoData 
} from "../../types/customization";
import { FrameSelector } from "./frame-selector";
import { StyleSelector } from "./style-selector";
import { ShapeSelector } from "./shape-selector";
import { LogoSelector } from "./logo-selector";

interface QRCustomizationProps {
  customizationData: QRCustomizationData;
  onCustomizationChange: (data: QRCustomizationData) => void;
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
  const isFrameSelected = customizationData.frame.id !== "frame-none";

  const handleFrameChange = useCallback((frameData: FrameData) => {
    onCustomizationChange({
      ...customizationData,
      frame: frameData,
    });
  }, [customizationData, onCustomizationChange]);

  const handleStyleChange = useCallback((styleData: StyleData) => {
    onCustomizationChange({
      ...customizationData,
      style: styleData,
    });
  }, [customizationData, onCustomizationChange]);

  const handleShapeChange = useCallback((shapeData: ShapeData) => {
    onCustomizationChange({
      ...customizationData,
      shape: shapeData,
    });
  }, [customizationData, onCustomizationChange]);

  const handleLogoChange = useCallback((logoData: LogoData) => {
    onCustomizationChange({
      ...customizationData,
      logo: logoData,
    });
  }, [customizationData, onCustomizationChange]);

  const frameSelector = (
    <FrameSelector
      frameData={customizationData.frame}
      onFrameChange={handleFrameChange}
      disabled={disabled}
      isMobile={isMobile}
    />
  );

  const styleSelector = (
    <StyleSelector
      styleData={customizationData.style}
      onStyleChange={handleStyleChange}
      frameSelected={isFrameSelected}
      disabled={disabled}
      isMobile={isMobile}
    />
  );

  const shapeSelector = (
    <ShapeSelector
      shapeData={customizationData.shape}
      onShapeChange={handleShapeChange}
      disabled={disabled}
      isMobile={isMobile}
    />
  );

  const logoSelector = (
    <LogoSelector
      logoData={customizationData.logo}
      onLogoChange={handleLogoChange}
      disabled={disabled}
      isMobile={isMobile}
    />
  );

  return isMobile || !homepageDemo ? (
    <Tabs.Root
      value={activeTab}
      onValueChange={onTabChange}
      className="text-neutral flex w-full flex-col items-center justify-center gap-4"
    >
      <Tabs.List className="flex w-full items-center gap-1 overflow-x-auto rounded-lg">
        {QR_STYLES_OPTIONS.map((tab) => (
          <Tabs.Trigger
            key={tab.id}
            value={tab.label}
            className={cn(
              "text-neutral flex h-12 items-center justify-center gap-2 rounded-md px-3.5 py-2 transition-colors md:h-9",
              "hover:bg-border-100 hover:text-neutral",
              "data-[state=active]:bg-secondary-100 data-[state=active]:text-secondary",
              {
                "cursor-not-allowed opacity-50": disabled,
              }
            )}
            disabled={disabled}
          >
            <span className="text-sm font-medium">{tab.label}</span>
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {QR_STYLES_OPTIONS.map((tab) => (
        <Tabs.Content
          key={tab.id}
          value={tab.label}
          className="w-full focus:outline-none"
        >
          {tab.id === "frame" && frameSelector}
          {tab.id === "style" && styleSelector}
          {tab.id === "shape" && shapeSelector}
          {tab.id === "logo" && logoSelector}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  ) : (
    <div className="text-neutral flex w-full flex-col gap-8">
      {QR_STYLES_OPTIONS.map((tab) => (
        <div key={tab.id} className="flex w-full flex-col gap-4">
          <h3 className="text-lg font-medium">{tab.label}</h3>
          {tab.id === "frame" && frameSelector}
          {tab.id === "style" && styleSelector}
          {tab.id === "shape" && shapeSelector}
          {tab.id === "logo" && logoSelector}
        </div>
      ))}
    </div>
  );
};