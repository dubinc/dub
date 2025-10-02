import { Button } from "@dub/ui";
import QRCodeStyling from "qr-code-styling";
import { useQrBuilderContext } from "../context";
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
    homepageDemo,
    handleContinue,
  } = useQrBuilderContext();

  const handleSave = async () => {
    if (!qrCode || disabled) return;

    if (!selectedQrType || !formData) {
      toast.error("Please complete all required fields");
      return;
    }

    if (homepageDemo) {
      await handleContinue();
      return;
    }

  };

  return (
      <Button
        color="blue"
        className="grow basis-3/4 w-full"
        onClick={handleSave}
        disabled={disabled}
        text={"Download QR code"}
      />
  );
};
