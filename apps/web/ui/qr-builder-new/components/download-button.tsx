import { Button } from "@dub/ui";
import QRCodeStyling from "qr-code-styling";

interface DownloadButtonProps {
  qrCode: QRCodeStyling | null;
  disabled?: boolean;
}

export const DownloadButton = ({
  qrCode,
  disabled = false,
}: DownloadButtonProps) => {
  const handleDownload = async () => {
    if (!qrCode || disabled) return;
    // TODO QR_BUILDER_NEW: Download function
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
