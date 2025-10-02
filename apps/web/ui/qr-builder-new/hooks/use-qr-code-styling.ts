import QRCodeStyling, { Options } from "qr-code-styling";
import { useEffect, useState, useMemo } from "react";
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

export const useQRCodeStyling = ({
  customizationData,
  defaultData = "https://getqr.com/qr-complete-setup"
}: UseQRCodeStylingOptions) => {
  const [qrCode, setQrCode] = useState<QRCodeStyling | null>(null);
  const [options, setOptions] = useState<Options>(() => {
    const initialMappedOptions = mapCustomizationToQROptions(
      customizationData,
      defaultData,
    );

    const finalOptions: Options = {
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
      ...initialMappedOptions,
    };

    return finalOptions;
  });

  // Create stable references to track deep changes in customization data
  const customizationDataString = useMemo(() =>
    JSON.stringify(customizationData),
    [customizationData]
  );

  const frameDataString = useMemo(() =>
    JSON.stringify(customizationData.frame),
    [customizationData.frame]
  );

  useEffect(() => {
    const qrCodeStyling = new QRCodeStyling(options);
    setQrCode(qrCodeStyling);
  }, []);

  useEffect(() => {
    if (!qrCode) return;

    const mappedOptions = mapCustomizationToQROptions(
      customizationData,
      defaultData,
    );

    const newOptions: Options = {
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

    // Handle logo rendering
    if (customizationData.logo.type === "uploaded") {
      if (customizationData.logo.file) {
        // Use blob URL for temporary preview (before upload completes)
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          newOptions.image = base64;
          setOptions(newOptions);
          qrCode.update(newOptions);
        };
        reader.readAsDataURL(customizationData.logo.file);
        return;
      } else if (customizationData.logo.fileId) {
        // Construct full R2 URL for uploaded logo using fileId
        const storageBaseUrl = process.env.NEXT_PUBLIC_STORAGE_BASE_URL;
        if (storageBaseUrl) {
          newOptions.image = `${storageBaseUrl}/files/${customizationData.logo.fileId}`;
        } else {
          // Fallback: try to construct URL without base (relative path)
          // This will work if storage is on same domain or CORS is configured
          console.warn('NEXT_PUBLIC_STORAGE_BASE_URL is not configured. Using relative path for uploaded logo.');
          newOptions.image = `/files/${customizationData.logo.fileId}`;
        }
      } else {
        newOptions.image = '';
      }
    } else if (
      customizationData.logo.type === "suggested" &&
      customizationData.logo.id &&
      customizationData.logo.id !== "logo-none"
    ) {
      // Use iconSrc if available (from logo selection), otherwise lookup from logo constant
      const logoSrc = customizationData.logo.iconSrc || getSuggestedLogoSrc(customizationData.logo.id);

      if (logoSrc) {
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
            newOptions.image = base64;
            setOptions(newOptions);
            qrCode.update(newOptions);
          })
          .catch((error) => {
            // Logo failed to load, render QR without logo
            console.warn(`Logo failed to load: ${logoSrc}. Rendering QR code without logo.`, error);
            newOptions.image = '';
            setOptions(newOptions);
            qrCode.update(newOptions);
          });
        // Don't update yet, wait for fetch to complete
        return;
      } else {
        newOptions.image = '';
      }
    } else {
      newOptions.image = '';
    }

    setOptions(newOptions);
    qrCode.update(newOptions);
  }, [qrCode, customizationDataString, defaultData]);

  useEffect(() => {
    if (!qrCode) return;

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
  }, [qrCode, frameDataString]);

  return qrCode;
};