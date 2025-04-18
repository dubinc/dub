import QRCodeStyling, {
  CornerDotType,
  CornerSquareType,
  Options,
} from "qr-code-styling";
import { DotType } from "qr-code-styling/lib/types";
import { useEffect, useState } from "react";
import {
  BLACK_COLOR,
  FRAMES,
  TRANSPARENT_COLOR,
  WHITE_COLOR,
} from "../constants.ts";
import { convertSvgUrlToBase64 } from "../utils.ts";

export function useQrCustomization(data = "https://www.getqr.com/") {
  const [qrCode, setQrCode] = useState<QRCodeStyling | null>(null);
  const [uploadedLogo, setUploadedLogo] = useState<File | null>(null);
  const [selectedSuggestedLogo, setSelectedSuggestedLogo] = useState("none");
  const [selectedSuggestedFrame, setSelectedSuggestedFrame] = useState("none");

  const [options, setOptions] = useState<Options>({
    width: 300,
    height: 300,
    type: "svg",
    data: data,
    margin: 10,
    qrOptions: {
      typeNumber: 0,
      mode: "Byte",
      errorCorrectionLevel: "Q",
    },
    dotsOptions: {
      type: "dots",
      color: "text-neutral",
    },
    backgroundOptions: {
      color: WHITE_COLOR.toUpperCase(),
    },
    cornersSquareOptions: {
      type: "square",
      color: BLACK_COLOR,
    },
    cornersDotOptions: {
      type: "square",
      color: BLACK_COLOR,
    },
    imageOptions: {
      imageSize: 0.4,
      hideBackgroundDots: true,
      crossOrigin: "anonymous",
    },
  });

  useEffect(() => {
    const qrCodeStyling = new QRCodeStyling(options);
    setQrCode(qrCodeStyling);
  }, []);

  useEffect(() => {
    if (!qrCode) return;
    qrCode.update(options);

    if (selectedSuggestedFrame !== "none") {
      const extensionFn = FRAMES[selectedSuggestedFrame];
      if (extensionFn) qrCode.applyExtension(extensionFn);
    } else {
      qrCode.deleteExtension?.();
    }
  }, [options, selectedSuggestedFrame]);

  const handlers = {
    onBorderStyleChange: (newType: CornerSquareType) => {
      setOptions((prevOptions) => ({
        ...prevOptions,
        cornersSquareOptions: {
          ...prevOptions.cornersSquareOptions,
          type: newType,
        },
      }));
    },
    onCenterStyleChange: (newType: CornerDotType) => {
      setOptions((prevOptions) => ({
        ...prevOptions,
        cornersDotOptions: { ...prevOptions.cornersDotOptions, type: newType },
      }));
    },
    onBorderColorChange: (color: string) => {
      setOptions((prevOptions) => ({
        ...prevOptions,
        dotsOptions: { ...prevOptions.dotsOptions, color },
        cornersSquareOptions: { ...prevOptions.cornersSquareOptions, color },
        cornersDotOptions: { ...prevOptions.cornersDotOptions, color },
      }));
    },
    onDotsStyleChange: (newType: DotType) => {
      setOptions((prevOptions) => ({
        ...prevOptions,
        dotsOptions: { ...prevOptions.dotsOptions, type: newType },
      }));
    },
    onBackgroundColorChange: (color: string) => {
      setOptions((prevOptions) => ({
        ...prevOptions,
        backgroundOptions: { color },
      }));
    },
    onTransparentBackgroundToggle: (checked: boolean) => {
      setOptions((prevOptions) => ({
        ...prevOptions,
        backgroundOptions: {
          color: checked ? TRANSPARENT_COLOR : WHITE_COLOR,
        },
      }));
    },
    onSuggestedLogoSelect: async (logoType: string, logoUrl?: string) => {
      if (selectedSuggestedLogo === logoType) return;

      setSelectedSuggestedLogo(logoType);
      setUploadedLogo(null);

      if (!logoUrl || logoType === "none") {
        setOptions((prevOptions) => ({ ...prevOptions, image: undefined }));
        return;
      }

      const base64 = await convertSvgUrlToBase64(logoUrl);
      setOptions((prevOptions) => ({
        ...prevOptions,
        image: base64,
        imageOptions: { ...prevOptions.imageOptions, crossOrigin: "anonymous" },
      }));
    },
    onSuggestedFrameSelect: (frameId: string) => {
      setSelectedSuggestedFrame(frameId);

      if (!qrCode) return;

      qrCode.update(options);

      const selected = FRAMES.find((f) => f.type === frameId);
      if (selected?.extension) {
        qrCode.applyExtension(selected.extension);
        setOptions((prevOptionsOptions) => ({
          ...prevOptionsOptions,
          width: 600,
        }));
      } else {
        qrCode.deleteExtension();
        setOptions((prevOptionsOptions) => ({
          ...prevOptionsOptions,
          width: 300,
        }));
      }
    },
    setUploadedLogoFile: (file: File | null) => {
      setSelectedSuggestedLogo("none");

      if (!file) {
        setUploadedLogo(null);
        setOptions((prevOptions) => ({ ...prevOptions, image: undefined }));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setOptions((prevOptions) => ({
          ...prevOptions,
          image: base64,
          imageOptions: {
            ...prevOptions.imageOptions,
            crossOrigin: "anonymous",
          },
        }));
      };
      reader.readAsDataURL(file);

      setUploadedLogo(file);
    },
  };

  return {
    options,
    qrCode,
    uploadedLogo,
    selectedSuggestedLogo,
    selectedSuggestedFrame,
    setOptions,
    handlers,
  };
}
