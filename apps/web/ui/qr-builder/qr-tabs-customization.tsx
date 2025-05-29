import { cn } from "@dub/utils";
import * as Tabs from "@radix-ui/react-tabs";
import { FC } from "react";

import { FrameSelector } from "@/ui/qr-builder/components/frame-selector.tsx";
import { LogoSelector } from "@/ui/qr-builder/components/logo-selector.tsx";
import { ShapeSelector } from "@/ui/qr-builder/components/shape-selector.tsx";
import { StyleSelector } from "@/ui/qr-builder/components/style-selector.tsx";
import { CornerDotType, CornerSquareType } from "qr-code-styling";
import { DotType, Options } from "qr-code-styling/lib/types";
import { QR_STYLES_OPTIONS } from "./constants/get-qr-config.ts";

interface QrTabsCustomizationProps {
  styleOptionActiveTab: string;
  setStyleOptionActiveActiveTab: (tab: string) => void;
  selectedSuggestedFrame: string;
  selectedSuggestedLogo: string;
  uploadedLogo: File | null;
  isQrDisabled: boolean;
  isMobile: boolean;
  options: Options;
  handlers: {
    onSuggestedFrameSelect: (type: string) => void;
    onDotsStyleChange: (type: DotType) => void;
    onBorderColorChange: (color: string) => void;
    onBackgroundColorChange: (color: string) => void;
    onBorderStyleChange: (type: CornerSquareType) => void;
    onCenterStyleChange: (type: CornerDotType) => void;
    onSuggestedLogoSelect: (type: string, src?: string) => void;
    setUploadedLogoFile: (file: File | null) => void;
  };
}

export const QrTabsCustomization: FC<QrTabsCustomizationProps> = ({
  styleOptionActiveTab,
  setStyleOptionActiveActiveTab,
  selectedSuggestedFrame,
  selectedSuggestedLogo,
  isQrDisabled,
  isMobile,
  options,
  handlers,
}) => {
  return isMobile ? (
    <Tabs.Root
      value={styleOptionActiveTab}
      onValueChange={setStyleOptionActiveActiveTab}
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
            )}
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
          {tab.id === "frame" && (
            <FrameSelector
              selectedSuggestedFrame={selectedSuggestedFrame}
              isQrDisabled={isQrDisabled}
              onFrameSelect={handlers.onSuggestedFrameSelect}
            />
          )}

          {tab.id === "style" && (
            <StyleSelector
              options={options}
              isMobile={isMobile}
              onDotsStyleChange={handlers.onDotsStyleChange}
              onBorderColorChange={handlers.onBorderColorChange}
              onBackgroundColorChange={handlers.onBackgroundColorChange}
            />
          )}

          {tab.id === "shape" && (
            <ShapeSelector
              options={options}
              onBorderStyleChange={handlers.onBorderStyleChange}
              onCenterStyleChange={handlers.onCenterStyleChange}
            />
          )}

          {tab.id === "logo" && (
            <LogoSelector
              selectedSuggestedLogo={selectedSuggestedLogo}
              isQrDisabled={isQrDisabled}
              onSuggestedLogoSelect={handlers.onSuggestedLogoSelect}
              onUploadLogo={handlers.setUploadedLogoFile}
            />
          )}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  ) : (
    <div className="text-neutral flex w-full flex-col gap-8">
      {QR_STYLES_OPTIONS.map((tab) => (
        <div key={tab.id} className="flex w-full flex-col gap-4">
          <h3 className="text-lg font-medium">{tab.label}</h3>
          {tab.id === "frame" && (
            <FrameSelector
              selectedSuggestedFrame={selectedSuggestedFrame}
              isQrDisabled={isQrDisabled}
              onFrameSelect={handlers.onSuggestedFrameSelect}
            />
          )}
          {tab.id === "style" && (
            <StyleSelector
              options={options}
              isMobile={isMobile}
              onDotsStyleChange={handlers.onDotsStyleChange}
              onBorderColorChange={handlers.onBorderColorChange}
              onBackgroundColorChange={handlers.onBackgroundColorChange}
            />
          )}
          {tab.id === "shape" && (
            <ShapeSelector
              options={options}
              onBorderStyleChange={handlers.onBorderStyleChange}
              onCenterStyleChange={handlers.onCenterStyleChange}
            />
          )}
          {tab.id === "logo" && (
            <LogoSelector
              selectedSuggestedLogo={selectedSuggestedLogo}
              isQrDisabled={isQrDisabled}
              onSuggestedLogoSelect={handlers.onSuggestedLogoSelect}
              onUploadLogo={handlers.setUploadedLogoFile}
            />
          )}
        </div>
      ))}
    </div>
  );
};
