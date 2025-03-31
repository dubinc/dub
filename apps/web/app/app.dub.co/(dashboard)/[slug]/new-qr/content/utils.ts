import { EQRType } from "../../../../(public)/landing/constants/get-qr-config.ts";

export const getMaxSizeLabel = (qrType: EQRType) => {
  const maxSizes: Partial<Record<EQRType, { size: number; label: string }>> = {
    [EQRType.IMAGE]: { size: 15 * 1024 * 1024, label: "15MB" },
    [EQRType.VIDEO]: { size: 300 * 1024 * 1024, label: "300MB" },
    [EQRType.PDF]: { size: 100 * 1024 * 1024, label: "100MB written" },
  };

  return maxSizes[qrType] || { size: 0, label: "Unsupported size" };
};
