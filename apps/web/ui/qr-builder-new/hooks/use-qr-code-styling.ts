import QRCodeStyling, { Options } from "qr-code-styling";
import { useEffect, useState, useMemo } from "react";
import { BLACK_COLOR, WHITE_COLOR } from "../constants/customization/colors";
import { FRAMES } from "../constants/customization/frames";
import {
  convertSvgUrlToBase64,
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

    return {
      width: 300,
      height: 300,
      type: "svg",
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
      type: "svg",
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

    if (
      customizationData.logo.type === "uploaded" &&
      customizationData.logo.file
    ) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        newOptions.image = base64;
        setOptions(newOptions);
        qrCode.update(newOptions);
      };
      reader.readAsDataURL(customizationData.logo.file);
      return;
    } else if (
      customizationData.logo.type === "suggested" &&
      customizationData.logo.id &&
      customizationData.logo.id !== "logo-none"
    ) {
      const logoSrc = getSuggestedLogoSrc(customizationData.logo.id);
      if (logoSrc) {
        convertSvgUrlToBase64(logoSrc).then((base64) => {
          if (base64) {
            newOptions.image = base64;
            setOptions(newOptions);
            qrCode.update(newOptions);
          }
        });
        return;
      } else {
        newOptions.image = undefined;
      }
    } else {
      newOptions.image = undefined;
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