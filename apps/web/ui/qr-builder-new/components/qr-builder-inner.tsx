import { QrBuilderButtons } from "@/ui/qr-builder-new/components/qr-builder-buttons.tsx";
import { QRBuilderSteps } from "@/ui/qr-builder-new/components/qr-builder-steps.tsx";
import { useQrBuilderContext } from "@/ui/qr-builder-new/context";
import { useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Flex } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { QRCodeDemoPlaceholder } from "../constants/qr-code-demo-placeholder.tsx";
import { QRCustomization } from "./customization";
import { QRPreview } from "./customization/qr-preview";
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
    builderStep,
    handleBack,
    handleContinue,
    qrBuilderButtonsWrapperRef,
    contentStepRef,
    customizationData,
    customizationActiveTab,
    updateCustomizationData,
    setCustomizationActiveTab,
    homepageDemo,
    isProcessing,
    isFileUploading,
    isFileProcessing,
    isEditMode,
  } = useQrBuilderContext();

  const logoData = customizationData.logo;

  const qrCodeDemo = currentQRType ? QRCodeDemoMap[currentQRType] : null;

  const { isMobile } = useMediaQuery();

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
    >
      <div className="flex w-full flex-col gap-4">
        <div className="flex h-full w-full flex-col items-start justify-between gap-4">
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
            <div className="flex w-full justify-start h-full">
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

          {!isMobile && !isTypeStep && (
            <div className="w-full" ref={qrBuilderButtonsWrapperRef}>
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
                logoData={logoData}
              />
            </div>
          )}
        </div>
      </div>

      <div
        className={cn(
          "relative flex h-auto min-h-[370px] shrink-0 basis-1/3 items-center justify-center rounded-lg",
          {
            "hidden md:flex": isTypeStep && !homepageDemo,
            "!hidden": isTypeStep && homepageDemo,
          },
        )}
      >
        {!isCustomizationStep && (
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
                <>
                  {qrCodeDemo && <qrCodeDemo.Component {...demoProps} />}
                </>
              )}
            </motion.div>
          </div>
        )}

        {isCustomizationStep && (
          <div className="flex w-full flex-col gap-6">
            <QRPreview
              homepageDemo={homepageDemo}
              customizationData={customizationData}
            />
          </div>
        )}
      </div>
    </Flex>
  );
};
