export const QR_STYLES_OPTIONS = [
  {
    id: "frame",
    label: "Frame",
  },
  {
    id: "style",
    label: "Style",
  },
  {
    id: "shape",
    label: "Shape",
  },
  {
    id: "logo",
    label: "Logo",
  },
];

export type TQRStyleOptionId = "frame" | "style" | "shape" | "logo";
export type TQRStyleOption = typeof QR_STYLES_OPTIONS[number];