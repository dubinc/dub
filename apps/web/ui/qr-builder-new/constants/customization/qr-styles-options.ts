import { Frame, Palette, Shapes, Image } from "lucide-react";

export const QR_STYLES_OPTIONS = [
  {
    id: "frame",
    label: "Frame",
    description: "Add a stylish frame around your QR code",
    icon: Frame,
  },
  {
    id: "style",
    label: "Style",
    description: "Customize colors and patterns of your QR code",
    icon: Palette,
  },
  {
    id: "shape",
    label: "Shape",
    description: "Choose the shape style for your QR code elements",
    icon: Shapes,
  },
  {
    id: "logo",
    label: "Logo",
    description: "Add your brand logo to the center of the QR code",
    icon: Image,
  },
];

export type TQRStyleOptionId = "frame" | "style" | "shape" | "logo";
export type TQRStyleOption = (typeof QR_STYLES_OPTIONS)[number];
