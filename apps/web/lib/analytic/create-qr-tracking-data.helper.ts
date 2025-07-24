import { QRBuilderData } from "@/ui/qr-builder/types/types.ts";

export const createQRTrackingParams = (
  qrBuilderData: QRBuilderData,
  qrId?: string,
) => {
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
