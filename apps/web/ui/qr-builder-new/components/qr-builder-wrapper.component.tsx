import { useRef } from "react";
import { QRBuilderInner } from "./qr-builder-inner.component";
import { QRBuilderSteps } from "./qr-builder-steps.component";
import { QrBuilderButtons } from "@/ui/qr-builder/components/qr-builder-buttons";
import { useQrBuilder } from "@/ui/qr-builder-new/context";
import { QRContentStepRef } from "./qr-content-step.tsx";
import { useIsInViewport } from "../hooks/use-is-in-viewport";
import { QrTabsDownloadButton } from "./qr-tabs-download-button";
import { useMediaQuery } from "@dub/ui";

export const QRBuilderWrapper = () => {
  const {
    builderStep,
    isTypeStep,
    isContentStep,
    isCustomizationStep,
    handleChangeStep,
    onSave,
  } = useQrBuilder();
  
  const contentStepRef = useRef<QRContentStepRef>(null);
  const qrBuilderButtonsWrapperRef = useRef<HTMLDivElement>(null);
  const navigationButtonsInViewport = useIsInViewport(
    qrBuilderButtonsWrapperRef,
    0.6,
  );
  const { isMobile } = useMediaQuery();

  const handleBack = () => {
    const newStep = Math.max((builderStep || 1) - 1, 1);
    handleChangeStep(newStep);
  };

  const handleContinue = async () => {
    console.log('111111111')
    if (isContentStep && contentStepRef.current) {
      const isValid = await contentStepRef.current.validateForm();
      if (!isValid) {
        return;
      }
    }
    
    if (isCustomizationStep) {
      onSave();
      return;
    }
    
    const newStep = Math.min((builderStep || 1) + 1, 3);
    handleChangeStep(newStep);
  };

  return (
    <div className="border-border-500 mx-auto flex h-full w-full flex-col justify-between rounded-lg border bg-white">
      <QRBuilderSteps />
      <div className="border-t-border-500 flex w-full flex-col items-stretch justify-between gap-4 border-t p-6 md:gap-6">
        <QRBuilderInner contentStepRef={contentStepRef} />
        
        {!isTypeStep && (
          <div ref={qrBuilderButtonsWrapperRef} className="w-full">
            <QrBuilderButtons
              step={builderStep || 1}
              onBack={handleBack}
              onContinue={handleContinue}
              isEdit={false}
              isProcessing={false}
              homePageDemo={false}
            />
          </div>
        )}
      </div>
      
      
      {/*{!isMobile && !navigationButtonsInViewport && isCustomizationStep && (*/}
      {/*  <div className="fixed bottom-6 right-6 z-50">*/}
      {/*    <QrTabsDownloadButton*/}
      {/*      onRegistrationClick={onSave}*/}
      {/*      isQrDisabled={false}*/}
      {/*    />*/}
      {/*  </div>*/}
      {/*)}*/}
    </div>
  );
};
