import { QrBuilderButtons } from "@/ui/qr-builder-new/components/qr-builder-buttons.tsx";
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
      <div className="flex w-full flex-col justify-between gap-4">
        <div className="flex h-full w-full flex-col items-start justify-between gap-4">
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

          {isContentStep && <QrContentStep ref={contentStepRef} />}
          {!isMobile && !isTypeStep && !isCustomizationStep && (
            <div className="w-full" ref={qrBuilderButtonsWrapperRef}>
              <QrBuilderButtons
                step={builderStep || 1}
                onBack={handleBack}
                onContinue={handleContinue}
                isEdit={false}
                isProcessing={isProcessing}
                isFileUploading={isFileUploading}
                isFileProcessing={isFileProcessing}
                homepageDemo={homepageDemo}
                currentFormValues={currentFormValues}
                logoData={logoData}
              />
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
              {!isMobile && (
                <div className="mt-4 w-full">
                  <QrBuilderButtons
                    step={builderStep || 1}
                    onBack={handleBack}
                    onContinue={handleContinue}
                    isEdit={false}
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
          )}
        </div>
      </div>

      <div
        className={cn(
          "bg-background relative h-auto shrink-0 basis-2/5 rounded-lg px-6 pb-0 pt-3 md:p-6 [&_svg]:h-[200px] md:[&_svg]:h-full",
          {
            "hidden md:flex": isTypeStep,
            "flex items-center justify-center": isContentStep,
            "flex items-start justify-center pb-3": isCustomizationStep,
            "md:flex md:items-start md:justify-center": !isContentStep,
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
                  <div className="absolute inset-x-0 bottom-0 h-1/5 bg-[linear-gradient(180deg,_rgba(255,255,255,0)_0%,_rgba(255,255,255,0.1)_30%,_rgba(255,255,255,0.4)_70%,_rgba(255,255,255,0.8)_100%)] backdrop-blur-[1px]"></div>
                </>
              )}
            </motion.div>
          </div>
        )}

        {isCustomizationStep && (
          <div className="center sticky top-20 flex h-max w-full flex-col gap-6">
            <QRPreview customizationData={customizationData} />
          </div>
        )}
      </div>
    </Flex>
  );
};
