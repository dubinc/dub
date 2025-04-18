import { StaticImageData } from "next/image";
import { CornerDotType, CornerSquareType } from "qr-code-styling";
import { DotType } from "qr-code-styling/lib/types";
import CircleBorderIcon from "./icons/border/circle.svg";
import RoundedBorderIcon from "./icons/border/rounded.svg";
import SquareBorderIcon from "./icons/border/square.svg";
import CircleCenterIcon from "./icons/center/circle.svg";
import SquareCenterIcon from "./icons/center/square.svg";
import DummyFrame from "./icons/dummy-frame.svg";
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
    extension: (svg, options) => {
      const { width, height } = options;
      const centerX = width / 2;
      const centerY = height / 2;

      const scale = 2.4;

      const qrSize = Math.min(width, height);
      const frameHeight = qrSize * scale;

      const cupTop = centerY - frameHeight / 2;

      const cup = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      cup.setAttribute(
        "d",
        `
      M ${centerX - 80 * scale} ${centerY + 60 * scale}
      q -10 ${-80 * scale} 0 ${-120 * scale}
      h ${160 * scale}
      q 10 ${40 * scale} 0 ${120 * scale}
      z
    `,
      );
      cup.setAttribute("fill", "none");
      cup.setAttribute("stroke", "#000000");
      cup.setAttribute("stroke-width", String(8 * scale));
      svg.appendChild(cup);

      const handle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      handle.setAttribute(
        "d",
        `
      M ${centerX + 80 * scale} ${centerY - 40 * scale}
      a ${30 * scale} ${30 * scale} 0 1 1 0 ${80 * scale}
      a ${15 * scale} ${15 * scale} 0 1 0 0 ${-80 * scale}
    `,
      );
      handle.setAttribute("fill", "none");
      handle.setAttribute("stroke", "#000000");
      handle.setAttribute("stroke-width", String(8 * scale));
      svg.appendChild(handle);

      for (let i = -20; i <= 20; i += 20) {
        const steam = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );
        steam.setAttribute(
          "d",
          `M ${centerX + i * scale} ${centerY - 80 * scale} q ${5 * scale} ${-20 * scale} 0 ${-40 * scale}`,
        );
        steam.setAttribute("stroke", "#000000");
        steam.setAttribute("stroke-width", String(4 * scale));
        steam.setAttribute("fill", "none");
        steam.setAttribute("stroke-linecap", "round");
        svg.appendChild(steam);
      }

      const saucer = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "ellipse",
      );
      saucer.setAttribute("cx", String(centerX));
      saucer.setAttribute("cy", String(centerY + 80 * scale));
      saucer.setAttribute("rx", String(120 * scale));
      saucer.setAttribute("ry", String(10 * scale));
      saucer.setAttribute("fill", "#000000");
      svg.appendChild(saucer);

      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      text.setAttribute("x", String(centerX));
      text.setAttribute("y", String(cupTop + frameHeight - 25 * scale));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", String(20 * scale));
      text.setAttribute("fill", "#000000");
      text.textContent = "SCAN ME";
      svg.appendChild(text);
    },
    icon: DummyFrame,
  },
  {
    id: "frame-scooter",
    type: "scooter",
    extension: async (svg, options) => {
      const { src } = Scooter;

      try {
        const res = await fetch(src);
        const svgText = await res.text();
        const parsed = new DOMParser().parseFromString(
          svgText,
          "image/svg+xml",
        ).documentElement;

        parsed.setAttribute("width", String(options.width));
        parsed.setAttribute("height", String(options.height));
        parsed.setAttribute("overflow", "visible");

        const scooterGroup = parsed.querySelector("g#scooter");
        if (scooterGroup) {
          scooterGroup.setAttribute(
            "transform",
            "scale(2.5) translate(-100, -122)",
          );
          scooterGroup.setAttribute("overflow", "visible");
        }

        const qrGroup = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "g",
        );

        while (svg.firstChild) {
          qrGroup.appendChild(svg.firstChild);
        }

        qrGroup.setAttribute("transform", "translate(-135, -120)");
        svg.appendChild(qrGroup);

        svg.appendChild(parsed);
      } catch (err) {
        console.error("Failed to load or parse scooter SVG:", err);
      }
    },

    icon: ScooterPreview,
  },
];

export const WHITE_COLOR = "#ffffff";
export const SHORT_WHITE_COLOR = "#fff";
export const BLACK_COLOR = "#000000";
export const TRANSPARENT_COLOR = "transparent";
