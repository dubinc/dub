import { QRBuilderSteps } from "@/ui/qr-builder-new/components/qr-builder-steps.tsx";
import { useQrBuilderContext } from "@/ui/qr-builder-new/context";
import { useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Flex } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
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
              // "hidden md:flex": isTypeStep && !homepageDemo,
              "!hidden": isTypeStep,
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
        <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[99] bg-white data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <Dialog.Content
              className={cn(
                "fixed inset-x-0 bottom-0 z-[100] flex h-dvh flex-col bg-white outline-none",
                "[&_input]:!text-[16px] [&_textarea]:!text-[16px]",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
                "data-[state=open]:duration-300 data-[state=closed]:duration-300",
              )}
            >
              <div
                className="relative flex h-full w-full flex-col"
                style={{ minHeight: "100dvh" }}
              >
              {/* Header with close button and stepper */}
              <div className="flex-shrink-0 border-b bg-white p-3">
                <QRBuilderSteps />
              </div>

              <div
                className="flex-1 overflow-y-auto p-3 pb-[80px]"
                style={{
                  WebkitOverflowScrolling: "touch",
                  overscrollBehavior: "contain",
                  minHeight: 0,
                }}
              >
                <Flex
                  direction="column-reverse"
                  gap="4"
                  className="w-full items-stretch"
                  style={{ minWidth: 0 }}
                >
                  <div
                    className="flex w-full flex-col justify-between gap-4"
                    style={{ minWidth: 0 }}
                  >
                    {stepContent}
                  </div>

                  <div
                    className="relative flex h-auto shrink-0 items-start justify-center rounded-lg"
                    style={{ minWidth: 0 }}
                  >
                    <div
                      className="mb-4 flex w-full flex-col items-center gap-4"
                      style={{ minWidth: 0 }}
                    >
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
              <div className="absolute bottom-0 left-0 right-0 z-50 border-t bg-white p-3 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
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
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </>
  );
};
