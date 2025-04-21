import { StaticImageData } from "next/image";
import { CornerDotType, CornerSquareType } from "qr-code-styling";
import { DotType } from "qr-code-styling/lib/types";
import CircleBorderIcon from "./icons/border/circle.svg";
import RoundedBorderIcon from "./icons/border/rounded.svg";
import SquareBorderIcon from "./icons/border/square.svg";
import CircleCenterIcon from "./icons/center/circle.svg";
import SquareCenterIcon from "./icons/center/square.svg";
import CoffeeCupPreview from "./icons/frames/coffee-cup-preview.svg";
import CoffeeCup from "./icons/frames/coffee-cup.svg";
import ScooterPreview from "./icons/frames/scooter-preview.svg";
import Scooter from "./icons/frames/scooter.svg";
import LinkLogoIcon from "./icons/logos/link.svg";
import WhatsAppLogoIcon from "./icons/logos/whatsapp.svg";
import WifiLogoIcon from "./icons/logos/wifi.svg";
import NoLogoIcon from "./icons/no-logo.svg";

export type TStyleOption = {
  id: string;
  icon: StaticImageData;
  type: CornerSquareType | CornerDotType | DotType | string;
  extension?: (
    svg: SVGSVGElement,
    options: { width: number; height: number },
  ) => void;
};

export const BORDER_STYLES: TStyleOption[] = [
  {
    id: "border-square",
    icon: SquareBorderIcon,
    type: "square",
  },
  { id: "border-rounded", icon: RoundedBorderIcon, type: "rounded" },
  { id: "border-dot", icon: CircleBorderIcon, type: "dot" },
  {
    id: "border-extra-rounded",
    icon: CircleBorderIcon,
    type: "extra-rounded",
  },
  { id: "border-classy", icon: CircleBorderIcon, type: "classy" },
  {
    id: "border-classy-rounded",
    icon: CircleBorderIcon,
    type: "classy-rounded",
  },
];

export const CENTER_STYLES: TStyleOption[] = [
  { id: "center-square", icon: SquareCenterIcon, type: "square" },
  { id: "center-dot", icon: CircleCenterIcon, type: "dot" },
  { id: "center-dots", icon: CircleCenterIcon, type: "dots" },
  { id: "center-rounded", icon: CircleCenterIcon, type: "rounded" },
  { id: "center-classy", icon: CircleCenterIcon, type: "classy" },
  {
    id: "center-classy-rounded",
    icon: CircleCenterIcon,
    type: "classy-rounded",
  },
  {
    id: "center-extra-rounded",
    icon: CircleCenterIcon,
    type: "extra-rounded",
  },
];

export const DOTS_STYLES: TStyleOption[] = [
  {
    id: "dots-dots",
    icon: SquareCenterIcon,
    type: "dots",
  },
  {
    id: "dots-rounded",
    icon: SquareCenterIcon,
    type: "rounded",
  },
  {
    id: "dots-classy",
    icon: SquareCenterIcon,
    type: "classy",
  },
  {
    id: "dots-classy-rounded",
    icon: SquareCenterIcon,
    type: "classy-rounded",
  },
  {
    id: "dots-square",
    icon: SquareCenterIcon,
    type: "square",
  },
  {
    id: "dots-extra-rounded",
    icon: SquareCenterIcon,
    type: "extra-rounded",
  },
];

export const SUGGESTED_LOGOS: TStyleOption[] = [
  {
    id: "logo-none",
    type: "none",
    icon: NoLogoIcon,
  },
  {
    id: "logo-wifi",
    type: "wifi",
    icon: WifiLogoIcon,
  },
  {
    id: "logo-link",
    type: "link",
    icon: LinkLogoIcon,
  },
  {
    id: "logo-whatsapp",
    type: "whatsapp",
    icon: WhatsAppLogoIcon,
  },
];

export const FRAMES: TStyleOption[] = [
  {
    id: "frame-none",
    type: "none",
    icon: NoLogoIcon,
  },
  {
    id: "frame-coffee-cup",
    type: "coffee-cup",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, CoffeeCup, 0.47, 150, 160);
    },

    icon: CoffeeCupPreview,
  },
  {
    id: "frame-scooter",
    type: "scooter",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, Scooter, 0.35, 130, 135);
    },

    icon: ScooterPreview,
  },
];

async function embedQRIntoFrame(
  svg: SVGSVGElement,
  options: { width: number; height: number },
  frame: StaticImageData,
  qrScale: number,
  qrTranslateX: number,
  qrTranslateY: number,
) {
  const { src } = frame;

  try {
    const res = await fetch(src);
    const svgText = await res.text();
    const frame = new DOMParser().parseFromString(
      svgText,
      "image/svg+xml",
    ).documentElement;

    frame.setAttribute("width", String(options.width));
    frame.setAttribute("height", String(options.height));

    const qrGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

    while (svg.firstChild) {
      qrGroup.appendChild(svg.firstChild);
    }

    qrGroup.setAttribute(
      "transform",
      `scale(${qrScale}) translate(${qrTranslateX}, ${qrTranslateY})`,
    );
    svg.appendChild(qrGroup);

    svg.appendChild(frame);
  } catch (err) {
    console.error("Failed to load or parse frame SVG:", err);
  }
}

export const WHITE_COLOR = "#ffffff";
export const SHORT_WHITE_COLOR = "#fff";
export const BLACK_COLOR = "#000000";
export const TRANSPARENT_COLOR = "transparent";
