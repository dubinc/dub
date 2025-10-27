import QRCodeStyling, { Options } from "qr-code-styling";
import { useEffect, useMemo, useState } from "react";
import { BLACK_COLOR, WHITE_COLOR } from "../constants/customization/colors";
import { FRAMES } from "../constants/customization/frames";
import {
  getSuggestedLogoSrc,
  mapCustomizationToQROptions,
} from "../helpers/qr-style-mappers";
import { IQRCustomizationData } from "../types/customization";

interface UseQRCodeStylingOptions {
  customizationData: IQRCustomizationData;
  defaultData?: string;
}

const createBaseQROptions = (
  customizationData: IQRCustomizationData,
  defaultData: string,
): Options => {
  const mappedOptions = mapCustomizationToQROptions(
    customizationData,
    defaultData,
  );

  return {
    width: 300,
    height: 300,
    type: "svg" as const,
    margin: 10,
    qrOptions: {
      typeNumber: 0,
      mode: "Byte",
      errorCorrectionLevel: "Q",
    },
    imageOptions: {
      imageSize: 0.4,
      hideBackgroundDots: true,
      crossOrigin: "anonymous",
      margin: 10,
    },
    ...mappedOptions,
  };
};

const handleUploadedLogo = (
  customizationData: IQRCustomizationData,
  options: Options,
  qrCode: QRCodeStyling,
  setOptions: (options: Options) => void,
): boolean => {
  if (customizationData.logo.file) {
    // Use blob URL for temporary preview (before upload completes)
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      options.image = base64;
      setOptions(options);
      qrCode.update(options);
    };
    reader.readAsDataURL(customizationData.logo.file);
    return true; // Async update in progress
  } else if (customizationData.logo.fileId) {
    // Construct full R2 URL for uploaded logo using fileId
    const storageBaseUrl =
      process.env.NEXT_PUBLIC_STORAGE_BASE_URL ||
      "https://dev-assets.getqr.com";
    options.image = `${storageBaseUrl}/qrs-content/${customizationData.logo.fileId}`;
  } else {
    options.image = "";
  }
  return false; // Sync update
};

const handleSuggestedLogo = (
  customizationData: IQRCustomizationData,
  options: Options,
  qrCode: QRCodeStyling,
  setOptions: (options: Options) => void,
): boolean => {
  const logoSrc =
    customizationData.logo.iconSrc ||
    getSuggestedLogoSrc(customizationData.logo.id!);

  if (!logoSrc) {
    options.image = "";
    return false; // Sync update
  }

  // Convert SVG to base64 to avoid CORS and 404 issues
  fetch(logoSrc)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch logo: ${response.statusText}`);
      }
      return response.text();
    })
    .then((svgText) => {
      // Convert SVG to base64 data URL
      const base64 = `data:image/svg+xml;base64,${btoa(svgText)}`;
      options.image = base64;
      setOptions(options);
      qrCode.update(options);
    })
    .catch((error) => {
      // Logo failed to load, render QR without logo
      console.warn(
        `Logo failed to load: ${logoSrc}. Rendering QR code without logo.`,
        error,
      );
      options.image = "";
      setOptions(options);
      qrCode.update(options);
    });
  return true; // Async update in progress
};

const updateQRCodeWithLogo = (
  customizationData: IQRCustomizationData,
  defaultData: string,
  qrCode: QRCodeStyling,
  setOptions: (options: Options) => void,
): void => {
  const newOptions = createBaseQROptions(customizationData, defaultData);

  let isAsyncUpdate = false;

  // Handle logo rendering based on type
  if (customizationData.logo.type === "uploaded") {
    isAsyncUpdate = handleUploadedLogo(
      customizationData,
      newOptions,
      qrCode,
      setOptions,
    );
  } else if (
    customizationData.logo.type === "suggested" &&
    customizationData.logo.id &&
    customizationData.logo.id !== "logo-none"
  ) {
    isAsyncUpdate = handleSuggestedLogo(
      customizationData,
      newOptions,
      qrCode,
      setOptions,
    );
  } else {
    newOptions.image = "";
  }

  // Only update synchronously if not handling async logo load
  if (!isAsyncUpdate) {
    setOptions(newOptions);
    qrCode.update(newOptions);
  }
};

const updateQRFrame = (
  customizationData: IQRCustomizationData,
  qrCode: QRCodeStyling,
): void => {
  const frame = FRAMES.find((f) => f.id === customizationData.frame.id);

  if (
    customizationData.frame.id === "none" ||
    customizationData.frame.id === "frame-none" ||
    !frame?.extension
  ) {
    qrCode.deleteExtension?.();
    return;
  }

  qrCode.applyExtension?.((qr, opts) =>
    frame.extension!(qr as SVGSVGElement, {
      width: opts.width!,
      height: opts.height!,
      frameColor: customizationData.frame.color || BLACK_COLOR,
      frameTextColor: customizationData.frame.textColor || WHITE_COLOR,
      frameText: customizationData.frame.text || "SCAN ME",
    }),
  );
};

export const useQRCodeStyling = ({
  customizationData,
  defaultData = "https://getqr.com/qr-complete-setup",
}: UseQRCodeStylingOptions) => {
  const [qrCode, setQrCode] = useState<QRCodeStyling | null>(null);
  const [options, setOptions] = useState<Options>(() =>
    createBaseQROptions(customizationData, defaultData),
  );

  // Create stable references to track deep changes in customization data
  const customizationDataString = useMemo(
    () => JSON.stringify(customizationData),
    [customizationData],
  );

  const frameDataString = useMemo(
    () => JSON.stringify(customizationData.frame),
    [customizationData.frame],
  );

  useEffect(() => {
    const qrCodeStyling = new QRCodeStyling(options);
    setQrCode(qrCodeStyling);
  }, []);

  useEffect(() => {
    if (!qrCode) return;
    updateQRCodeWithLogo(customizationData, defaultData, qrCode, setOptions);
  }, [qrCode, customizationDataString, defaultData]);

  useEffect(() => {
    if (!qrCode) return;
    updateQRFrame(customizationData, qrCode);
  }, [qrCode, frameDataString]);

  return qrCode;
};
