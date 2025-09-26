import { useQRCodeStyling } from "../../hooks/use-qr-code-styling";
import { IQRCustomizationData } from "../../types/customization";
import { DownloadButton } from "../download-button";
import { QRCanvas } from "../qr-canvas";

interface QRPreviewProps {
  customizationData: IQRCustomizationData;
}

export const QRPreview = ({ customizationData }: QRPreviewProps) => {
  const qrCode = useQRCodeStyling({
    customizationData,
    defaultData: "https://getqr.com/qr-complete-setup",
  });

  return (
    <div>
      <div className="flex flex-col items-center gap-4 mb-4 rounded-lg shadow-lg">
        <QRCanvas qrCode={qrCode} width={300} height={300} />
      </div>
      <DownloadButton qrCode={qrCode} />
    </div>
  );
};
