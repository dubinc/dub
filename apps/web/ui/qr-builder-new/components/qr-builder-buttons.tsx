import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { Flex, Responsive } from "@radix-ui/themes";
import { ChevronLeft } from "lucide-react";
import { FC, useCallback } from "react";

interface IQrBuilderButtonsProps {
  step: number;
  onBack: () => void;
  onContinue: () => Promise<void>;
  maxStep?: number;
  minStep?: number;
  className?: string;
  size?: Responsive<"3" | "4" | "1" | "2"> | undefined;
  display?: Responsive<"none" | "inline-flex" | "flex"> | undefined;
  isEdit?: boolean;
  isProcessing?: boolean;
  isFileUploading?: boolean;
  isFileProcessing?: boolean;
  homepageDemo?: boolean;
  currentFormValues?: Record<string, any>;
  logoData?: { type: string; fileId?: string; file?: File };
}

export const QrBuilderButtons: FC<IQrBuilderButtonsProps> = ({
  step,
  onBack,
  onContinue,
  maxStep = 3,
  minStep = 1,
  className,
  size = "4",
  display = "flex",
  isEdit = false,
  isProcessing = false,
  isFileUploading = false,
  isFileProcessing = false,
  homepageDemo = false,
  currentFormValues = {},
  logoData,
}) => {
  const isLastStep = step === maxStep;

  // Check if QR title is filled (required on content step)
  const isContentStep = step === 2;
  const qrName = currentFormValues?.qrName;
  const isTitleEmpty = isContentStep && (!qrName || qrName.trim() === "");

  // Check if logo upload is incomplete (on customization step)
  const isCustomizationStep = step === 3;
  const hasUploadedLogoWithoutFileId =
    isCustomizationStep && logoData?.type === "uploaded" && !logoData?.fileId;

  const getButtonText = useCallback(() => {
    if (isFileUploading) return "Uploading...";
    if (isFileProcessing) return "Processing...";
    if (isEdit) return "Save changes";
    if (!isLastStep) return "Continue";
    if (homepageDemo) return "Download QR Code";

    return "Create QR Code";
  }, [isFileUploading, isFileProcessing, isEdit, isLastStep, homepageDemo]);

  const buttonText = getButtonText();

  return (
    <Flex
      justify="between"
      display={display}
      gap="4"
      className={cn("w-full md:w-auto", className)}
    >
      <Button
        size={size}
        variant="secondary"
        color="blue"
        className="border-secondary focus-visible:border-secondary-500 hover:bg-secondary-50 text-secondary data-[state=open]:border-secondary-500 data-[state=open]:ring-secondary-200 flex min-h-10 min-w-0 shrink basis-1/4"
        disabled={step <= minStep || isProcessing}
        onClick={onBack}
        icon={
          <ChevronLeft
            className={cn("text-secondary", {
              "text-neutral-400": isProcessing,
            })}
          />
        }
        text={<span className="hidden md:inline">Back</span>}
      />

      <Button
        type="submit"
        size={size}
        color="blue"
        className="grow basis-3/4"
        onClick={onContinue}
        disabled={
          isProcessing ||
          isFileUploading ||
          isFileProcessing ||
          isTitleEmpty ||
          hasUploadedLogoWithoutFileId
        }
        loading={isProcessing || isFileUploading || isFileProcessing}
        text={buttonText}
      />
    </Flex>
  );
};
