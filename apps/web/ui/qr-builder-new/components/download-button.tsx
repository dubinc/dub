import { Button } from "@dub/ui";
import QRCodeStyling from "qr-code-styling";
import { useQrBuilder } from "../context";
import { TNewQRBuilderData } from "../helpers/data-converters";
import { toast } from "sonner";

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
    customizationData,
    qrTitle,
    fileId,
    homepageDemo,
    onDownload,
  } = useQrBuilder();

  const handleDownload = async () => {
    if (!qrCode || disabled) return;

    if (!selectedQrType || !formData) {
      toast.error("Please complete all required fields");
      return;
    }

    console.log("DOWNLOAD BUTTON - QR Code:", qrCode);
    console.log("DOWNLOAD BUTTON - Selected QR Type:", selectedQrType);
    console.log("DOWNLOAD BUTTON - Form Data:", formData);
    console.log("DOWNLOAD BUTTON - Customization Data:", customizationData);

    const builderData: TNewQRBuilderData = {
      qrType: selectedQrType,
      formData,
      customizationData,
      title: qrTitle || `${selectedQrType} QR Code`,
      fileId,
    };

    console.log("DOWNLOAD BUTTON - Builder Data for download:", builderData);

    if (homepageDemo && onDownload) {
      await onDownload(builderData);
      return;
    }

    // For non-homepage demo, implement direct download functionality
    try {
      await qrCode.download({
        name: qrTitle || `${selectedQrType}_qr_code`,
        extension: "png",
      });

      toast.success("QR code downloaded successfully!");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download QR code");
    }
  };

  return (
      <Button
        color="blue"
        className="grow basis-3/4 w-full"
        onClick={handleDownload}
        disabled={disabled}
        text={"Download QR code"}
      />
  );
};
