import { useMemo } from "react";
import { useQrBuilderContext } from "../../context";
import { encodeQRData } from "../../helpers/qr-data-handlers";
import { useQRCodeStyling } from "../../hooks/use-qr-code-styling";
import { IQRCustomizationData } from "../../types/customization";
import { QRCanvas } from "../qr-canvas";

interface QRPreviewProps {
  customizationData: IQRCustomizationData;
}

export const QRPreview = ({ customizationData }: QRPreviewProps) => {
  const { selectedQrType, formData, currentFormValues } = useQrBuilderContext();

  const activeFormData =
    Object.keys(currentFormValues || {}).length > 0
      ? currentFormValues
      : formData;

  const qrData = useMemo(() => {
    if (selectedQrType && activeFormData) {
      try {
        const data = encodeQRData(selectedQrType, activeFormData as any);
        return data || "https://getqr.com/qr-complete-setup";
      } catch (error) {
        console.error("Error generating QR data:", error);
        return "https://getqr.com/qr-complete-setup";
      }
    }
    return "https://getqr.com/qr-complete-setup";
  }, [selectedQrType, activeFormData]);

  const qrCode = useQRCodeStyling({
    customizationData,
    defaultData: qrData,
  });

  return (
    <div className="mb-4 flex flex-col items-center gap-4 rounded-lg shadow-lg">
      <QRCanvas qrCode={qrCode} width={300} height={300} />
      {/* <DownloadButton qrCode={qrCode} disabled={isDisabled} /> */}
    </div>
  );
};
