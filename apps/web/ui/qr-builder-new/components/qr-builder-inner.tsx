import { QRBuilderSteps } from "@/ui/qr-builder-new/components/qr-builder-steps.tsx";
import { useQrBuilderContext } from "@/ui/qr-builder-new/context";
import { useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Flex } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { QRCodeDemoPlaceholder } from "../constants/qr-code-demo-placeholder.tsx";
import { useQRCodeStyling } from "../hooks/use-qr-code-styling";
import { QRCustomization } from "./customization";
import { QRPreview } from "./customization/qr-preview";
import { DownloadButton } from "./download-button";
import { QrBuilderButtons } from "./qr-builder-buttons";
import { QRCodeDemoMap } from "./qr-code-demos/qr-code-demo-map";
import { QrContentStep } from "./qr-content-step.tsx";
import { QrTypeSelection } from "./qr-type-selection";

export const QRBuilderInner = () => {
  const {
    isTypeStep,
    isContentStep,
    isCustomizationStep,
    selectedQrType,
    hoveredQRType,
    currentQRType,
    typeSelectionError,
    currentFormValues,
    handleSelectQRType,
    handleHoverQRType,
    contentStepRef,
    customizationData,
    customizationActiveTab,
    updateCustomizationData,
    setCustomizationActiveTab,
    homepageDemo,
    isEditMode,
    isProcessing,
    isFileUploading,
    isFileProcessing,
    handleBack,
    handleContinue,
    builderStep,
    isFormValid,
  } = useQrBuilderContext();

  const qrCodeDemo = currentQRType ? QRCodeDemoMap[currentQRType] : null;

  const { isMobile } = useMediaQuery();

  // QR code instance for download
  const qrCode = useQRCodeStyling({
    customizationData,
    defaultData: "https://getqr.com/qr-complete-setup",
  });

  const demoProps = useMemo(() => {
    if (!qrCodeDemo || !currentQRType) return {};

    return qrCodeDemo.propsKeys.reduce(
      (acc: Record<string, any>, key: string) => {
        acc[key] = currentFormValues[key];
        return acc;
      },
      {},
    );
  }, [qrCodeDemo, currentQRType, currentFormValues]);

  return (
    <Flex
      direction={{ initial: "column-reverse", md: "row" }}
      gap={{ initial: "4", md: "6" }}
      className="items-stretch"
    >
      <div className="flex w-full flex-col gap-4 justify-between">
        <div className="flex w-full flex-col items-start justify-start gap-4">
          {!isTypeStep && (
            <div className="w-full">
              <QRBuilderSteps />
            </div>
          )}

          {isTypeStep && (
            <Flex
              gap="4"
              direction="column"
              align="start"
              justify="start"
              className="w-full"
            >
              <QrTypeSelection
                selectedQRType={isTypeStep ? null : selectedQrType}
                onSelect={handleSelectQRType}
                onHover={handleHoverQRType}
              />
              {typeSelectionError && (
                <div className="text-sm font-medium text-red-500">
                  {typeSelectionError}
                </div>
              )}
            </Flex>
          )}

          {isContentStep && (
            <div className="flex w-full justify-start">
              <QrContentStep ref={contentStepRef} />
            </div>
          )}

          {isCustomizationStep && (
            <div className="w-full">
              <QRCustomization
                customizationData={customizationData}
                onCustomizationChange={updateCustomizationData}
                activeTab={customizationActiveTab}
                onTabChange={setCustomizationActiveTab}
                isMobile={isMobile}
                homepageDemo={homepageDemo}
              />
            </div>
          )}
        </div>

        {!isTypeStep && !isMobile && (
          <div className="w-full">
            <QrBuilderButtons
              step={builderStep || 1}
              onBack={handleBack}
              onContinue={handleContinue}
              isEdit={isEditMode}
              isProcessing={isProcessing}
              isFileUploading={isFileUploading}
              isFileProcessing={isFileProcessing}
              homepageDemo={homepageDemo}
              currentFormValues={currentFormValues}
              logoData={customizationData.logo}
              isFormValid={isFormValid}
            />
          </div>
        )}
      </div>

      <div
        className={cn(
          "relative h-auto shrink-0 basis-1/3 items-start justify-center rounded-lg md:flex",
          {
            "hidden md:flex": isTypeStep && !homepageDemo,
            "!hidden": isTypeStep && homepageDemo,
            "items-start": isCustomizationStep,
          },
        )}
      >
        {!isTypeStep && (
          <div className="sticky top-20 flex w-full flex-col items-center gap-6">
            {!isCustomizationStep ? (
              <div className="relative inline-block">
                <motion.div
                  key={
                    currentQRType
                      ? `${currentQRType}-${hoveredQRType !== null ? "hovered" : "default"}`
                      : "placeholder"
                  }
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 },
                    exit: { opacity: 0, y: 20 },
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {!currentQRType ? (
                    <QRCodeDemoPlaceholder />
                  ) : (
                    <>{qrCodeDemo && <qrCodeDemo.Component {...demoProps} />}</>
                  )}
                </motion.div>
              </div>
            ) : (
              <QRPreview
                homepageDemo={homepageDemo}
                customizationData={customizationData}
              />
            )}

            {!isMobile && (
              <div className="w-full " style={{ maxWidth: isCustomizationStep ? "300px" :"270px" }}>
                <DownloadButton
                  qrCode={isCustomizationStep ? qrCode : null}
                  disabled={!selectedQrType || (isContentStep && !isFormValid)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </Flex>
  );
};
