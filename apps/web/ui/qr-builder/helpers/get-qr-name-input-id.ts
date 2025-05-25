import {
  QR_NAME_INPUT,
  QRInputConfig,
} from "@/ui/qr-builder/constants/qr-type-inputs-config.ts";

export const getQRNameInput = (postfix: string): QRInputConfig => ({
  ...QR_NAME_INPUT,
  id: `qrName-${postfix}`,
});
