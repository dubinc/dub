import { Button } from "@/components/ui/button";
import { cn } from "@dub/utils";
import { Flex, Responsive } from "@radix-ui/themes";
import { ChevronLeft, Loader2 } from "lucide-react";
import { FC, useCallback } from "react";
import QRCodeStyling from "qr-code-styling";
import { DownloadButton } from "./download-button";

interface IQrBuilderButtonsProps {
  step: number;
  onBack: () => void;
  onContinue: () => Promise<void>;
  maxStep?: number;
  minStep?: number;
  className?: string;
  display?: Responsive<"none" | "inline-flex" | "flex"> | undefined;
  isEdit?: boolean;
  isProcessing?: boolean;
  isFileUploading?: boolean;
  isFileProcessing?: boolean;
  homepageDemo?: boolean;
  currentFormValues?: Record<string, any>;
  logoData?: { type: string; fileId?: string; file?: File };
  isFormValid?: boolean;
  qrCode?: QRCodeStyling | null;
  isMobile?: boolean;
}

export const QrBuilderButtons: FC<IQrBuilderButtonsProps> = ({
  step,
  onBack,
  onContinue,
  maxStep = 3,
  minStep = 1,
  className,
  display = "flex",
  isEdit = false,
  isProcessing = false,
  isFileUploading = false,
  isFileProcessing = false,
  homepageDemo = false,
  currentFormValues = {},
  logoData,
  isFormValid = true,
  qrCode = null,
  isMobile = false,
}) => {
  const isLastStep = step === maxStep;
  const isContentStep = step === 2;
  const isCustomizationStep = step === 3;

  // Check if logo upload is incomplete (on customization step)
  const hasUploadedLogoWithoutFileId =
    isCustomizationStep && logoData?.type === "uploaded" && !logoData?.fileId;

  const getButtonText = useCallback(() => {
    if (isFileUploading) return "Uploading...";
    if (isFileProcessing) return "Processing...";
    if (isEdit) return "Save Changes";
    if (homepageDemo) return "Continue";

    return "Create QR Code";
  }, [isFileUploading, isFileProcessing, isEdit, isLastStep, homepageDemo]);

  const buttonText = getButtonText();

  const isLoading = isProcessing || isFileUploading || isFileProcessing;

  // Show download button on customization step (step 3) on mobile
  const showDownloadOnCustomizationStep = isCustomizationStep && isMobile && qrCode;

  return (
    <Flex
      justify="between"
      display={display}
      gap="4"
      className={cn("w-full", className)}
    >
      <Button
        variant="outline"
        size="lg"
        className={cn(
          "border-secondary text-secondary hover:bg-secondary/10 flex min-w-0 shrink gap-1 md:gap-2",
          {
            "border-neutral-400 text-neutral-400": isProcessing,
            "w-full": isLastStep && !showDownloadOnCustomizationStep,
            "basis-1/3": showDownloadOnCustomizationStep,
            "basis-1/4": !isLastStep && !showDownloadOnCustomizationStep,
          },
        )}
        disabled={step <= minStep || isProcessing}
        onClick={onBack}
      >
        <ChevronLeft
          className={cn("h-4 w-4", {
            "text-neutral-400": isProcessing,
          })}
        />
        <span>Back</span>
      </Button>

      {showDownloadOnCustomizationStep && (
        <div className="flex-1">
          <DownloadButton qrCode={qrCode} disabled={false} />
        </div>
      )}

      {!isLastStep ? (
        <Button
          type="submit"
          variant="outline"
          size="lg"
          className={cn(
            "border-secondary text-secondary hover:bg-secondary/10 w-full shrink",
            {
              "border-neutral-400 text-neutral-400": isProcessing,
            },
          )}
          onClick={onContinue}
          disabled={
            isProcessing ||
            isFileUploading ||
            isFileProcessing ||
            hasUploadedLogoWithoutFileId ||
            isCustomizationStep
          }
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {buttonText}
        </Button>
      ) : null}
    </Flex>
  );
};
