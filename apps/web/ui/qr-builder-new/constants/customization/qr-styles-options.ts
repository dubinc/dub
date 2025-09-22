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

export type QRStyleOptionId = "frame" | "style" | "shape" | "logo";
export type QRStyleOption = typeof QR_STYLES_OPTIONS[number];