import {
  BLACK_COLOR,
  TRANSPARENT_COLOR,
  WHITE_COLOR,
} from "@/ui/qr-builder/constants/customization/colors.ts";
import { FRAMES } from "@/ui/qr-builder/constants/customization/frames.ts";
import { EQRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { ResponseQrCode } from "@/ui/qr-code/qr-codes-container.tsx";
import QRCodeStyling, {
  CornerDotType,
  CornerSquareType,
  Options,
} from "qr-code-styling";
import { DotType } from "qr-code-styling/lib/types";
import { useEffect, useState } from "react";
import { convertSvgUrlToBase64 } from "../helpers/convert-svg-url-to-base64.ts";

export function useQrCustomization(initialData?: ResponseQrCode) {
  const [qrCode, setQrCode] = useState<QRCodeStyling | null>(null);
  const [uploadedLogo, setUploadedLogo] = useState<File | null>(null);
  const [selectedSuggestedLogo, setSelectedSuggestedLogo] = useState("none");
  const [selectedSuggestedFrame, setSelectedSuggestedFrame] = useState("none");

  const [selectedQRType, setSelectedQRType] = useState<EQRType>(
    (initialData?.qrType as EQRType) || EQRType.WEBSITE,
  );

  const qrPlaceholder = "https://www.getqr.com/";
  const [data, setData] = useState(initialData?.data || qrPlaceholder);
  const isQrDisabled = !data?.trim() || data === qrPlaceholder;

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
    ...(initialData?.styles as Options),
  });

  const parseQRData = (data: string, type: EQRType): Record<string, string> => {
    switch (type) {
      case EQRType.WHATSAPP:
        try {
          const url = new URL(data);
          let number = "";
          let message = "";

          if (url.hostname === "wa.me") {
            number = url.pathname.replace("/", "");
            const textParam = url.searchParams.get("text");
            message = textParam && textParam !== "undefined" ? decodeURIComponent(textParam) : "";
          } else if (
            url.hostname === "whatsapp.com" ||
            url.hostname === "api.whatsapp.com"
          ) {
            number = url.searchParams.get("phone") || "";
            const textParam = url.searchParams.get("text");
            message = textParam && textParam !== "undefined" ? decodeURIComponent(textParam) : "";
          }

          number = number.replace(/\D/g, "");

          if (number) {
            return {
              number,
              message,
            };
          }
        } catch (e) {
          const numberMatch = data.match(/\d+/);
          if (numberMatch) {
            return {
              number: numberMatch[0],
              message: "",
            };
          }
        }
        break;
      case EQRType.WIFI:
        const wifiMatch = data.match(/WIFI:T:(.+);S:(.+);P:(.+);H:(.+);/);
        if (wifiMatch) {
          return {
            networkName: wifiMatch[2],
            networkPassword: wifiMatch[3],
            networkEncryption: wifiMatch[1],
            isHiddenNetwork: wifiMatch[4],
          };
        }
        break;
      case EQRType.WEBSITE:
        return { websiteLink: data };
      case EQRType.APP_LINK:
        return { storeLink: data };
      case EQRType.SOCIAL:
        return { socialLink: data };
      case EQRType.FEEDBACK:
        return { link: data };
    }
    return {};
  };

  const [initialInputValues, setInitialInputValues] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (initialData) {
      const parsedData = parseQRData(
        initialData.data,
        initialData.qrType as EQRType,
      );
      setInitialInputValues(parsedData);
    }
  }, [initialData]);

  useEffect(() => {
    const qrCodeStyling = new QRCodeStyling(options);
    setQrCode(qrCodeStyling);
  }, []);

  useEffect(() => {
    if (!qrCode || isQrDisabled) return;

    setOptions((prevOptions) => ({
      ...prevOptions,
      data,
    }));

    if (selectedSuggestedFrame !== "none") {
      const extensionFn = FRAMES[selectedSuggestedFrame];
      if (extensionFn) qrCode.applyExtension(extensionFn);
    } else {
      qrCode.deleteExtension?.();
    }
  }, [qrCode, data, selectedSuggestedFrame, isQrDisabled]);

  useEffect(() => {
    if (!qrCode || isQrDisabled) return;

    qrCode.update(options);
  }, [qrCode, options, isQrDisabled]);

  useEffect(() => {
    if (initialData && qrCode) {
      if (
        initialData.frameOptions &&
        typeof initialData?.frameOptions === "object" &&
        "id" in initialData.frameOptions
      ) {
        const frameId = initialData.frameOptions.id as string;
        setSelectedSuggestedFrame(frameId);
        handlers.onSuggestedFrameSelect(frameId);
      }
      setSelectedQRType(initialData.qrType as EQRType);
    }
  }, [initialData, qrCode]);

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

      qrCode.update({ ...options, data });

      const selected = FRAMES.find((f) => f.type === frameId);

      if (selected?.extension) {
        qrCode.applyExtension(selected.extension);
      } else {
        qrCode.deleteExtension();
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
    data,
    setData,
    options,
    qrCode,
    uploadedLogo,
    selectedSuggestedLogo,
    selectedSuggestedFrame,
    setOptions,
    handlers,
    isQrDisabled,
    selectedQRType,
    setSelectedQRType,
    initialInputValues,
  };
}
