import {
  SHORT_WHITE_COLOR,
  WHITE_COLOR,
} from "@/ui/qr-builder/constants/customization/colors.ts";

export const isWhiteHex = (hex: string): boolean => {
  const formatted = hex.toLowerCase();
  return formatted === WHITE_COLOR || formatted === SHORT_WHITE_COLOR;
};
