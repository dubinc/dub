import { useMemo } from "react";
import { EQRType } from "../constants/get-qr-config";
import { convertServerQRToNewBuilder } from "../helpers/data-converters";
import { TQrStorageData } from "../types/database";
import { useQRCodeStyling } from "./use-qr-code-styling";

/**
 * Hook for displaying QR codes in workspace cards
 * Converts database format to QRCodeStyling object for rendering
 */
export function useQrDisplay(qrData: TQrStorageData | null) {
  // Convert server data to builder format
  const builderData = useMemo(() => {
    if (!qrData) return null;
    return convertServerQRToNewBuilder(qrData);
  }, [qrData]);

  // Determine the data to encode in QR
  const qrContent = useMemo(() => {
    if (!qrData) return "https://getqr.com";

    // For WiFi QR codes, use the raw data
    if (qrData.qrType === EQRType.WIFI) {
      return qrData.data || "https://getqr.com";
    }

    // For all other types, use the shortLink if available
    return qrData.link?.shortLink || qrData.data || "https://getqr.com";
  }, [qrData]);

  // Build QRCodeStyling object from customization data
  const qrCode = useQRCodeStyling({
    customizationData: builderData?.customizationData || {
      frame: { id: "frame-none" },
      style: {
        dotsStyle: "dots-square",
        foregroundColor: "#000000",
        backgroundColor: "#ffffff",
      },
      shape: {
        cornerSquareStyle: "corner-square-square",
        cornerDotStyle: "corner-dot-square",
      },
      logo: { type: "none" },
    },
    defaultData: qrContent,
  });

  return {
    qrCode,
    selectedQRType: qrData?.qrType as EQRType,
  };
}
