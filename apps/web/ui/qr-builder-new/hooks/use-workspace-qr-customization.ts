import { useCallback, useMemo, useState } from "react";
import { EQRType } from "../constants/get-qr-config";
import { convertServerQRToNewBuilder } from "../helpers/data-converters";
import {
  DEFAULT_QR_CUSTOMIZATION,
  IQRCustomizationData,
} from "../types/customization";
import { TQrStorageData } from "../types/database";
import { useQRCodeStyling } from "./use-qr-code-styling";

/**
 * Hook for managing QR customization in workspace contexts (outside QrBuilderProvider)
 * Replaces the old useQrCustomization hook with new builder data structures
 *
 * @param initialQrData - QR data from database
 * @param homepageDemo - Whether this is for homepage demo (uses special URL)
 * @returns QR code object, customization data, and update handlers
 */

export function useWorkspaceQrCustomization(
  initialQrData?: TQrStorageData | null,
  homepageDemo?: boolean,
) {
  const builderData = useMemo(() => {
    if (!initialQrData) return null;
    return convertServerQRToNewBuilder(initialQrData);
  }, [initialQrData]);

  const [customizationData, setCustomizationData] =
    useState<IQRCustomizationData>(() => {
      return builderData?.customizationData || DEFAULT_QR_CUSTOMIZATION;
    });

  const qrContent = useMemo(() => {
    if (!initialQrData) return "https://getqr.com";

    if (homepageDemo) {
      return `${typeof window !== "undefined" ? window.location.origin : "https://getqr.com"}/qr-complete-setup`;
    }

    if (initialQrData.qrType === EQRType.WIFI) {
      return initialQrData.data || "https://getqr.com";
    }

    return (
      initialQrData.link?.shortLink || initialQrData.data || "https://getqr.com"
    );
  }, [initialQrData, homepageDemo]);

  const qrCode = useQRCodeStyling({
    customizationData,
    defaultData: qrContent,
  });

  const updateCustomizationData = useCallback((data: IQRCustomizationData) => {
    setCustomizationData(data);
  }, []);

  return {
    qrCode,
    customizationData,
    updateCustomizationData,
    selectedQRType: initialQrData?.qrType as EQRType,
    qrContent,
  };
}
