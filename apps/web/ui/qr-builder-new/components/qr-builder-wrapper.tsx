import { QRBuilderInner } from "@/ui/qr-builder-new/components/qr-builder-inner.tsx";
import { useQrBuilderContext } from "@/ui/qr-builder-new/context";
import { cn } from "@dub/utils/src";
import { motion } from "framer-motion";
import { QrBuilderButtons } from "./qr-builder-buttons";
import { useMediaQuery } from "@dub/ui";
import { useQRCodeStyling } from "../hooks/use-qr-code-styling";

export const QRBuilderWrapper = () => {
  const {
    builderStep,
    isTypeStep,
    isContentStep,
    isCustomizationStep,
    qrBuilderContentWrapperRef,
    handleBack,
    handleContinue,
    isEditMode,
    isProcessing,
    isFileUploading,
    isFileProcessing,
    homepageDemo,
    currentFormValues,
    customizationData,
    isFormValid,
  } = useQrBuilderContext();

  const { isMobile } = useMediaQuery();

  // Show decorative border and blobs only on steps 2 and 3
  const showDecorations = isContentStep || isCustomizationStep;

  // QR code instance for mobile download button on step 2
  const qrCode = useQRCodeStyling({
    customizationData,
    defaultData: "https://getqr.com/qr-complete-setup",
  });

  return (
    <motion.div
      ref={qrBuilderContentWrapperRef}
      key={`builder-step-${builderStep}`}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={cn(
        "mx-auto flex h-full w-full flex-col justify-between",
        !isTypeStep &&
          "border-border-500 rounded-[20px] border bg-white shadow-lg",
      )}
    >
      {/* Decorative blobs - only on steps 2 and 3, hidden on mobile */}
      {showDecorations && !isMobile && (
        <>
          <div className="bg-primary/10 absolute -right-20 -top-20 h-72 w-72 animate-pulse rounded-full blur-3xl" />
          <div className="bg-secondary/10 absolute -bottom-20 -left-20 h-72 w-72 animate-pulse rounded-full blur-3xl delay-700" />
        </>
      )}

      <div className="relative">
        <div
          className={cn(
            "flex w-full flex-col items-stretch justify-between gap-4 p-6 md:gap-6",
            isTypeStep && "p-0",
          )}
        >
          <QRBuilderInner />
        </div>
      </div>

      {showDecorations && isMobile && (
        <div className="border-border-500 relative sticky bottom-0 z-10 mt-auto w-full border-t bg-white px-6 py-3">
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
      )}
    </motion.div>
  );
};
