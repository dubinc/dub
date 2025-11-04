import { TNewQRBuilderData } from "@/ui/qr-builder-new/helpers/data-converters";
import { QRBuilderData } from "@/ui/qr-builder/types/types.ts";

export const createQRTrackingParams = (
  qrBuilderData: QRBuilderData | TNewQRBuilderData,
  qrId?: string,
) => {
  // Check if it's new builder format (has customizationData)
  if ("customizationData" in qrBuilderData) {
    const { customizationData, qrType } = qrBuilderData;
    const frameId = customizationData.frame?.id || "frame-none";
    const frameType = frameId.replace("frame-", "");

    return {
      qrId,
      qrType: qrType as any,
      qrFrame: frameType !== "none" ? frameType : undefined,
      qrText: customizationData.frame?.text,
      qrFrameColour: customizationData.frame?.color,
      qrTextColour: customizationData.frame?.textColor,
      qrStyle: customizationData.style?.dotsStyle,
      qrBorderColour: customizationData.style?.foregroundColor,
      qrBorderStyle: customizationData.shape?.cornerSquareStyle,
      qrCenterStyle: customizationData.shape?.cornerDotStyle,
      qrLogo:
        customizationData.logo?.type !== "none"
          ? customizationData.logo?.type
          : "none",
      qrLogoUpload: customizationData.logo?.type === "uploaded",
    };
  }

  // Old builder format
  const frameOptions = qrBuilderData.frameOptions;

  return {
    qrId,
    qrType: qrBuilderData.qrType as any,
    qrFrame: frameOptions?.id !== "none" ? frameOptions?.id : undefined,
    qrText: frameOptions?.text,
    qrFrameColour: frameOptions?.color,
    qrTextColour: frameOptions?.textColor,
    qrStyle: qrBuilderData.styles?.dotsOptions?.type as string,
    qrBorderColour: qrBuilderData.styles?.cornersSquareOptions?.color as string,
    qrBorderStyle: qrBuilderData.styles?.cornersSquareOptions?.type as string,
    qrCenterStyle: qrBuilderData.styles?.cornersDotOptions?.type as string,
    qrLogo: qrBuilderData.styles?.image ? "custom" : "none",
    qrLogoUpload: !!qrBuilderData.styles?.image,
  };
};
