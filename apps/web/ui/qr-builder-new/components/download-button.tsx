import { Button } from "@/components/ui/button";
import QRCodeStyling from "qr-code-styling";
import { useCallback } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQrBuilderContext } from "../context";

interface DownloadButtonProps {
  qrCode: QRCodeStyling | null;
  disabled?: boolean;
}

export const DownloadButton = ({
  qrCode,
  disabled = false,
}: DownloadButtonProps) => {
  const {
    homepageDemo,
    isEditMode,
    isFileUploading,
    isFileProcessing,
    isProcessing,
    customizationData,
    onSave,
    isContentStep,
    contentStepRef,
    setFormData,
  } = useQrBuilderContext();

  // Check if logo upload is incomplete
  const hasUploadedLogoWithoutFileId =
    customizationData.logo?.type === "uploaded" &&
    !customizationData.logo?.fileId;

  const handleSave = useCallback(async () => {
    if (disabled) return;

    // If on content step, validate and get form data without changing step
    if (isContentStep && contentStepRef.current) {
      // Trigger validation without calling onSubmit (which changes step)
      const isValid = await contentStepRef.current.form.trigger();
      if (!isValid) {
        return;
      }

      // Get form values and update formData state
      const formValues = contentStepRef.current.getValues();
      setFormData(formValues as any);

      // Wait for state update
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Directly save/create the QR code without navigating steps
    await onSave();
  }, [
    disabled,
    isContentStep,
    contentStepRef,
    setFormData,
    onSave,
  ]);

  const getButtonText = useCallback(() => {
    if (isFileUploading) return "Uploading...";
    if (isFileProcessing) return "Processing...";
    if (isEditMode) return "Save changes";
    if (homepageDemo) return "Download QR Code";
    return "Create QR Code";
  }, [isFileUploading, isFileProcessing, isEditMode, homepageDemo]);

  const buttonText = getButtonText();
  const isDisabled =
    disabled ||
    isProcessing ||
    isFileUploading ||
    isFileProcessing ||
    hasUploadedLogoWithoutFileId;

  const isLoading = isProcessing || isFileUploading || isFileProcessing;

  return (
    <Button
      type="submit"
      size="lg"
      variant="default"
      className="bg-secondary hover:bg-secondary/90 w-full"
      onClick={handleSave}
      disabled={isDisabled}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {buttonText}
    </Button>
  );
};
