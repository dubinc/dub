import QRCodeStyling, { Options } from "qr-code-styling";
import { useEffect, useState } from "react";
import { BLACK_COLOR, WHITE_COLOR } from "../../constants/customization/colors";
import { FRAMES } from "../../constants/customization/frames";
import {
  convertSvgUrlToBase64,
  getSuggestedLogoSrc,
  mapCustomizationToQROptions,
} from "../../helpers/qr-style-mappers";
import { QRCustomizationData } from "../../types/customization";
import { DownloadButton } from "../download-button";
import { QRCanvas } from "../qr-canvas";

interface QRPreviewProps {
  customizationData: QRCustomizationData;
}

export const QRPreview = ({ customizationData }: QRPreviewProps) => {
  const [qrCode, setQrCode] = useState<QRCodeStyling | null>(null);

  const defaultData = "https://getqr.com/qr-complete-setup";

  const initialMappedOptions = mapCustomizationToQROptions(
    customizationData,
    defaultData,
    BLACK_COLOR,
    WHITE_COLOR,
  );

  const [options, setOptions] = useState<Options>({
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
  });

  useEffect(() => {
    const qrCodeStyling = new QRCodeStyling(options);
    setQrCode(qrCodeStyling);
  }, []);

  useEffect(() => {
    if (!qrCode) return;

    const mappedOptions = mapCustomizationToQROptions(
      customizationData,
      defaultData,
      BLACK_COLOR,
      WHITE_COLOR,
    );

    const newOptions: Options = {
      ...options,
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

    // Update options for non-uploaded and non-suggested logos
    setOptions(newOptions);
    qrCode.update(newOptions);
  }, [qrCode, customizationData]);

  // Handle frame extension
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
  }, [qrCode, customizationData.frame]);

  return (
    <div>
      <div className="flex flex-col items-center gap-4 mb-4 rounded-lg shadow-lg">
        <QRCanvas qrCode={qrCode} width={300} height={300} />
      </div>
      <DownloadButton qrCode={qrCode} />
    </div>
  );
};
