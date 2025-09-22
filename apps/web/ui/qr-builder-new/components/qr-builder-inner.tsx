import { useQrBuilder } from "@/ui/qr-builder-new/context";
import { QrBuilderButtons } from "@/ui/qr-builder/components/qr-builder-buttons.tsx";
import { QRCodeDemoPlaceholder } from "@/ui/qr-builder/components/qr-code-demos/qr-code-demo-placeholder";
import { useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Flex } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { useMemo, useEffect, useState } from "react";
import { QRCodeDemoMap } from "./qr-code-demos/qr-code-demo-map";
import { QrContentStep } from "./qr-content-step.tsx";
import { QrTypeSelection } from "./qr-type-selection";
import { QRCustomization } from "./customization";
import { QRPreview } from "./customization/qr-preview";

export const QRBuilderInner = () => {
  const {
    isTypeStep,
    isContentStep,
    isCustomizationStep,
    selectedQrType,
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
  } = useQrBuilder();

  const qrCodeDemo = currentQRType ? QRCodeDemoMap[currentQRType] : null;

  const { isMobile } = useMediaQuery();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
                selectedQRType={selectedQrType}
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
              <QrContentStep ref={contentStepRef} />
          )}
          {isClient && !isMobile && !isTypeStep && !isCustomizationStep && (
              <div className="w-full" ref={qrBuilderButtonsWrapperRef}>
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

          {isCustomizationStep && (
            <div className="w-full">
              <QRCustomization
                customizationData={customizationData}
                onCustomizationChange={updateCustomizationData}
                activeTab={customizationActiveTab}
                onTabChange={setCustomizationActiveTab}
                isMobile={isMobile}
                homepageDemo={true}
              />
              {isClient && !isMobile && (
                <div className="mt-4 w-full">
                  <QrBuilderButtons
                    step={builderStep || 1}
                    onBack={handleBack}
                    onContinue={handleContinue}
                    isEdit={false}
                    isProcessing={false}
                    homePageDemo={true}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className={cn(
          "bg-background relative h-auto shrink-0 basis-2/5 items-start justify-center rounded-lg px-6 pb-0 pt-3 md:flex md:p-6 [&_svg]:h-[200px] md:[&_svg]:h-full",
          {
            "hidden md:flex": isTypeStep,
            "items-start pb-3": isCustomizationStep,
          },
        )}
      >
        {!isCustomizationStep && (
          <div className="relative inline-block">
            {!currentQRType ? (
              <QRCodeDemoPlaceholder />
            ) : (
              <motion.div
                key={currentQRType}
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
                {qrCodeDemo && <qrCodeDemo.Component {...demoProps} />}
                <div className="absolute inset-x-0 bottom-0 h-1/5 bg-[linear-gradient(180deg,_rgba(255,255,255,0)_0%,_rgba(255,255,255,0.1)_30%,_rgba(255,255,255,0.4)_70%,_rgba(255,255,255,0.8)_100%)] backdrop-blur-[1px]"></div>
              </motion.div>
            )}
          </div>
        )}

        {isCustomizationStep && (
          <div className="center sticky w-full h-max top-20 flex flex-col gap-6">
            <QRPreview customizationData={customizationData} />
          </div>
        )}
      </div>
    </Flex>
  );
};
