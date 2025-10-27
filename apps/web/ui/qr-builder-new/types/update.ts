import { UpdateQrProps } from "@/lib/types";

/**
 * Result of comparing original and new QR data for updates
 */
export type TQRUpdateResult = {
  hasChanges: boolean;
  changes: {
    title: boolean;
    data: boolean;
    qrType: boolean;
    frameOptions: boolean;
    styles: boolean;
    logoOptions: boolean;
    files: boolean;
  };
  updateData: UpdateQrProps;
};
