import { Button } from "@dub/ui";
import QRCodeStyling from "qr-code-styling";
import { useCallback } from "react";
import { toast } from "sonner";
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
    selectedQrType,
    formData,
    homepageDemo,
    handleContinue,
    isEditMode,
    isFileUploading,
    isFileProcessing,
    isProcessing,
    customizationData,
  } = useQrBuilderContext();

  // Check if logo upload is incomplete
  const hasUploadedLogoWithoutFileId =
    customizationData.logo?.type === "uploaded" &&
    !customizationData.logo?.fileId;

  const handleSave = useCallback(async () => {
    if (!qrCode || disabled) return;

    if (!selectedQrType || !formData) {
      toast.error("Please complete all required fields");
      return;
    }

    if (homepageDemo) {
      await handleContinue();
      return;
    }
  }, [
    qrCode,
    disabled,
    selectedQrType,
    formData,
    homepageDemo,
    handleContinue,
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

  return (
    <Button
      color="blue"
      className="w-full grow basis-3/4"
      onClick={handleSave}
      disabled={isDisabled}
      loading={isProcessing || isFileUploading || isFileProcessing}
      text={buttonText}
    />
  );
};
