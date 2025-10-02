import { useMemo } from "react";
import { useQrBuilderContext } from "../../context";
import { encodeQRData } from "../../helpers/qr-data-handlers";
import { useQRCodeStyling } from "../../hooks/use-qr-code-styling";
import { IQRCustomizationData } from "../../types/customization";
import { DownloadButton } from "../download-button";
import { QRCanvas } from "../qr-canvas";

interface QRPreviewProps {
  customizationData: IQRCustomizationData;
}

export const QRPreview = ({ customizationData }: QRPreviewProps) => {
  const { selectedQrType, formData, currentFormValues } = useQrBuilderContext();

  // Get the actual QR data from form or use default
  // Try current form values first (for real-time updates), then fallback to saved form data
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

  // Debug: Check if QR code is being created
  if (qrCode) {
    console.log("QR Code instance created with data:", qrData);
  } else {
    console.log("QR Code instance is null");
  }

  const isDisabled = !selectedQrType || !activeFormData;

  return (
    <div>
      <div className="mb-4 flex flex-col items-center gap-4 rounded-lg shadow-lg">
        <QRCanvas qrCode={qrCode} width={300} height={300} />
      </div>
      <DownloadButton qrCode={qrCode} disabled={isDisabled} />
    </div>
  );
};
