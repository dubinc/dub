import { Frame, Palette, Image } from "lucide-react";

export const QR_STYLES_OPTIONS = [
  {
    id: "frame",
    label: "Frame",
    description: "Add a stylish frame around your QR code",
    icon: Frame,
  },
  {
    id: "style-shape",
    label: "Style & Shape",
    description: "Customize colors, shapes and patterns for your QR code",
    icon: Palette,
  },
  {
    id: "logo",
    label: "Logo",
    description: "Add your brand logo to the center of the QR code",
    icon: Image,
  },
];

export type TQRStyleOptionId = "frame" | "style-shape" | "logo";
export type TQRStyleOption = (typeof QR_STYLES_OPTIONS)[number];
