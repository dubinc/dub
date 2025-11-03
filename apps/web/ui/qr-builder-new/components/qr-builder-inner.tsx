import { QRBuilderSteps } from "@/ui/qr-builder-new/components/qr-builder-steps.tsx";
import { useQrBuilderContext } from "@/ui/qr-builder-new/context";
import { useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Flex } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useMemo } from "react";
import { Drawer } from "vaul";
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
    setBuilderStep,
    isDialogOpen,
    setIsDialogOpen,
  } = useQrBuilderContext();

  const qrCodeDemo = currentQRType ? QRCodeDemoMap[currentQRType] : null;

  const { isMobile } = useMediaQuery();

  const shouldUseDialog = isMobile && homepageDemo && !isTypeStep;

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setBuilderStep(1);
  };

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

  const stepContent = (
    <>
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
    </>
  );

  return (
    <>
      {/* Mobile stepper at the very top */}
      {!isTypeStep && isMobile && !shouldUseDialog && (
        <div className="w-full pb-4">
          <QRBuilderSteps />
        </div>
      )}

      <Flex
        direction={{ initial: "column-reverse", md: "row" }}
        gap={{ initial: "4", md: "6" }}
        className="items-stretch"
      >
        <div className="flex w-full flex-col justify-between gap-4">
          <div className="flex w-full flex-col items-start justify-start gap-4">
            {!isTypeStep && !isMobile && (
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

            {!shouldUseDialog && stepContent}
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
                      <>
                        {qrCodeDemo && <qrCodeDemo.Component {...demoProps} />}
                      </>
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
                <div
                  className="w-full"
                  style={{ maxWidth: isCustomizationStep ? "300px" : "270px" }}
                >
                  <DownloadButton
                    qrCode={isCustomizationStep ? qrCode : null}
                    disabled={
                      !selectedQrType || (isContentStep && !isFormValid)
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Flex>

      {shouldUseDialog && (
        <Drawer.Root
          open={isDialogOpen}
          dismissible={true}
          onOpenChange={(open) => {
            if (!open) {
              handleDialogClose();
            }
          }}
        >
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-50 bg-neutral-100 bg-opacity-10 backdrop-blur" />
            <Drawer.Content
              className={cn(
                "fixed left-0 right-0 top-0 z-50 flex max-h-[85vh] flex-col",
                "rounded-b-2xl bg-white",
              )}
            >
              <div className="flex h-full max-h-[85vh] flex-col">
                {/* Header with close button and stepper */}
                <div className="flex-shrink-0 border-b p-3">
                  <div className="mb-2 flex items-center justify-end">
                    <button
                      onClick={handleDialogClose}
                      className="rounded-full p-1 transition-colors hover:bg-gray-100"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <QRBuilderSteps />
                </div>

                <div className="flex-1 overflow-y-auto p-3 pb-20">
                  <Flex
                    direction="column-reverse"
                    gap="4"
                    className="items-stretch"
                  >
                    <div className="flex w-full flex-col justify-between gap-4">
                      <div className="flex w-full flex-col items-start justify-start gap-4">
                        {stepContent}
                      </div>
                    </div>

                    <div className="relative flex h-auto shrink-0 items-start justify-center rounded-lg">
                      <div className="mb-4 flex w-full flex-col items-center gap-4">
                        {!isCustomizationStep ? (
                          <div className="relative inline-block max-h-[200px] overflow-hidden">
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
                                  {qrCodeDemo && (
                                    <qrCodeDemo.Component {...demoProps} />
                                  )}
                                </>
                              )}
                            </motion.div>
                          </div>
                        ) : (
                          <QRPreview
                            homepageDemo={homepageDemo}
                            customizationData={customizationData}
                          />
                        )}
                      </div>
                    </div>
                  </Flex>
                </div>

                {/* Fixed footer with buttons */}
                <div className="absolute bottom-0 left-0 right-0 border-t bg-white p-3 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
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
                    qrCode={qrCode}
                    isMobile={isMobile}
                  />
                </div>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}
    </>
  );
};
