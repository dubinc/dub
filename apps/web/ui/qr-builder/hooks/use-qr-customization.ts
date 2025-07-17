import {
  BLACK_COLOR,
  WHITE_COLOR,
} from "@/ui/qr-builder/constants/customization/colors.ts";
import {
  FRAME_TEXT,
  FRAMES,
  isDefaultTextColor,
} from "@/ui/qr-builder/constants/customization/frames.ts";
import { EQRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { DEFAULT_WEBSITE } from "@/ui/qr-builder/constants/qr-type-inputs-placeholders.ts";
import { unescapeWiFiValue } from "@/ui/qr-builder/helpers/qr-type-data-handlers.ts";
import { FrameOptions, QrStorageData } from "@/ui/qr-builder/types/types.ts";
import QRCodeStyling, {
  CornerDotType,
  CornerSquareType,
  Options,
} from "qr-code-styling";
import { DotType } from "qr-code-styling/lib/types";
import { useEffect, useState } from "react";
import { convertSvgUrlToBase64 } from "../helpers/convert-svg-url-to-base64.ts";

export function useQrCustomization(
  initialData?: QrStorageData,
  homepageDemo?: boolean,
) {
  const frameOptions = initialData?.frameOptions as FrameOptions | null;

  const [qrCode, setQrCode] = useState<QRCodeStyling | null>(null);
  const [uploadedLogo, setUploadedLogo] = useState<File | null>(null);
  const [selectedSuggestedLogo, setSelectedSuggestedLogo] =
    useState<string>("none");
  const [selectedSuggestedFrame, setSelectedSuggestedFrame] = useState<string>(
    frameOptions?.id || "none",
  );
  const [frameColor, setFrameColor] = useState<string>(
    frameOptions?.color || BLACK_COLOR,
  );
  const [frameTextColor, setFrameTextColor] = useState<string>(
    frameOptions?.textColor || WHITE_COLOR,
  );
  const [frameText, setFrameText] = useState<string>(
    frameOptions?.text || FRAME_TEXT,
  );
  const [selectedQRType, setSelectedQRType] = useState<EQRType>(
    initialData?.qrType as EQRType,
  );

  const initialContentForQrBuild =
    initialData?.qrType !== "wifi"
      ? initialData?.link?.shortLink
      : initialData?.data;

  const [data, setData] = useState(initialContentForQrBuild || DEFAULT_WEBSITE);

  const isQrDisabled = !data?.trim() || data === DEFAULT_WEBSITE;

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
      margin: 10,
    },
    ...(initialData?.styles as Options),
  });

  const parseQRData = (
    data: string,
    type: EQRType,
  ): Record<string, string | File[]> => {
    switch (type) {
      case EQRType.WHATSAPP:
        try {
          const url = new URL(data);
          let number = "";
          let message = "";

          if (url.hostname === "wa.me") {
            number = url.pathname.replace("/", "");
            const textParam = url.searchParams.get("text");
            message =
              textParam && textParam !== "undefined"
                ? decodeURIComponent(textParam)
                : "";
          } else if (
            url.hostname === "whatsapp.com" ||
            url.hostname === "api.whatsapp.com"
          ) {
            number = url.searchParams.get("phone") || "";
            const textParam = url.searchParams.get("text");
            message =
              textParam && textParam !== "undefined"
                ? decodeURIComponent(textParam)
                : "";
          }

          number = number.replace(/\D/g, "");

          if (number) {
            return {
              number: `+${number}`,
              message,
            };
          }
        } catch (e) {
          const numberMatch = data.match(/\d+/);
          if (numberMatch) {
            return {
              number: `+${numberMatch[0]}`,
              message: "",
            };
          }
        }
        break;
      case EQRType.WIFI:
        const wifiMatch = data.match(
          /WIFI:T:([^;]+(?:\\;[^;]+)*);S:([^;]+(?:\\;[^;]+)*);P:([^;]+(?:\\;[^;]+)*);H:([^;]+(?:\\;[^;]+)*);/,
        );
        if (wifiMatch) {
          return {
            networkName: unescapeWiFiValue(wifiMatch[2]),
            networkPassword: unescapeWiFiValue(wifiMatch[3]),
            networkEncryption: unescapeWiFiValue(wifiMatch[1]),
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

  const [parsedInputValues, setParsedInputValues] = useState<
    Record<string, string | File[]>
  >({});

  useEffect(() => {
    if (initialData) {
      console.log("initialData", initialData);
      let parsedData = parseQRData(
        initialData.data,
        initialData.qrType as EQRType,
      );

      console.log("parsedData", parsedData);

      // Merge in preloaded files for file QRs types if present on dashboard
      if (
        (initialData.qrType === EQRType.IMAGE ||
          initialData.qrType === EQRType.VIDEO ||
          initialData.qrType === EQRType.PDF) &&
        (initialData as any).initialInputValues
      ) {
        parsedData = {
          ...parsedData,
          ...(initialData as any).initialInputValues,
        };
      }

      setParsedInputValues(parsedData);
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

    const frame = FRAMES.find((f) => f.type === selectedSuggestedFrame);

    if (selectedSuggestedFrame === "none" || !frame?.extension) {
      qrCode.deleteExtension?.();
      return;
    }

    qrCode.applyExtension?.((qr, opts) =>
      frame.extension!(qr as SVGSVGElement, {
        width: opts.width!,
        height: opts.height!,
        frameColor,
        frameTextColor,
        frameText,
      }),
    );
  }, [
    qrCode,
    data,
    selectedSuggestedFrame,
    isQrDisabled,
    frameColor,
    frameText,
    frameTextColor,
  ]);

  useEffect(() => {
    if (!qrCode || isQrDisabled) return;

    qrCode.update({
      ...options,
      data: homepageDemo ? `${window.location.origin}/qr-complete-setup` : data,
    });
  }, [qrCode, options, isQrDisabled, homepageDemo]);

  useEffect(() => {
    if (initialData && qrCode) {
      if (
        initialData.frameOptions &&
        typeof initialData?.frameOptions === "object" &&
        "id" in initialData.frameOptions
      ) {
        const frameId = initialData.frameOptions.id as string;
        setSelectedSuggestedFrame(frameId);

        if (frameId !== "none") {
          handlers.onSuggestedFrameSelect(frameId);
        }
      }

      if (
        initialData.frameOptions &&
        typeof initialData?.frameOptions === "object" &&
        "color" in initialData.frameOptions
      ) {
        const frameColor = initialData.frameOptions.color as string;
        setFrameColor(frameColor);
        handlers.onFrameColorChange(frameColor);
      }

      if (
        initialData.frameOptions &&
        typeof initialData?.frameOptions === "object" &&
        "textColor" in initialData.frameOptions
      ) {
        const frameTextColor = initialData.frameOptions.textColor as string;
        setFrameTextColor(frameTextColor);
        handlers.onFrameTextColorChange(frameTextColor);
      }

      if (
        initialData.frameOptions &&
        typeof initialData?.frameOptions === "object" &&
        "text" in initialData.frameOptions
      ) {
        const frameText = initialData.frameOptions.text as string;
        setFrameText(frameText);
        handlers.onFrameTextChange(frameText);
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
    onFrameColorChange: (color: string) => {
      setFrameColor(color);
    },
    onFrameTextColorChange: (color: string) => {
      setFrameTextColor(color);
    },
    onFrameTextChange: (text: string) => {
      setFrameText(text);
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

      const selected = FRAMES.find((f) => f.type === frameId);
      const isUsingDefaultColor =
        frameTextColor === selected?.defaultTextColor ||
        isDefaultTextColor(frameTextColor);
      if (!frameTextColor || isUsingDefaultColor) {
        setFrameTextColor(selected?.defaultTextColor || WHITE_COLOR);
      }

      setOptions((prevOptions) => ({
        ...prevOptions,
        backgroundOptions: { color: WHITE_COLOR },
      }));

      if (!qrCode) return;

      qrCode.update({
        ...options,
        backgroundOptions: {
          color: WHITE_COLOR,
        },
        data: homepageDemo
          ? `${window.location.origin}/qr-complete-setup`
          : data,
      });
    },
    setUploadedLogoFile: (file: File | null) => {
      if (file !== uploadedLogo) {
        setSelectedSuggestedLogo("none");
      }

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
    frameColor,
    frameTextColor,
    frameText,
    setOptions,
    handlers,
    isQrDisabled,
    selectedQRType,
    setSelectedQRType,
    parsedInputValues,
  };
}
