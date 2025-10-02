import { QRBuilderInner } from "@/ui/qr-builder-new/components/qr-builder-inner.tsx";
import { QRBuilderSteps } from "@/ui/qr-builder-new/components/qr-builder-steps.tsx";
import { QR_BUILDER_STEP_TITLES } from "@/ui/qr-builder-new/constants/get-qr-config.ts";
import { useQrBuilderContext } from "@/ui/qr-builder-new/context";
import { QrBuilderButtons } from "@/ui/qr-builder-new/components/qr-builder-buttons.tsx";
import { useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils/src";
import { Heading } from "@radix-ui/themes";
import React from "react";

export const QRBuilderWrapper = () => {
  const {
    builderStep,
    handleBack,
    handleContinue,
    isTypeStep,
    homepageDemo,
    isProcessing,
    isFileUploading,
    isFileProcessing,
  } = useQrBuilderContext();

  const { isMobile } = useMediaQuery();

  return (
    <div
      className={cn(
        "border-border-500 mx-auto flex h-full w-full flex-col justify-between rounded-lg border bg-white",
      )}
    >
      <div>
        <QRBuilderSteps />
        <div className="border-t-border-500 flex w-full flex-col items-stretch justify-between gap-4 border-t p-6 md:gap-6">
          <Heading as="h3" weight="medium" size="5" className="text-neutral">
            {QR_BUILDER_STEP_TITLES[(builderStep || 1) - 1]}
          </Heading>
          <QRBuilderInner />
        </div>
      </div>
      {!isTypeStep && isMobile && (
        <div className="border-border-500 sticky bottom-0 z-10 mt-auto w-full border-t bg-white px-6 py-3">
          <QrBuilderButtons
            step={builderStep || 1}
            onBack={handleBack}
            onContinue={handleContinue}
            isEdit={false}
            isProcessing={isProcessing}
            isFileUploading={isFileUploading}
            isFileProcessing={isFileProcessing}
            homepageDemo={homepageDemo}
          />
        </div>
      )}
    </div>
  );
};
