import { lightenHexColor } from "@/ui/qr-builder/helpers/lighten-hex-color.ts";
import { measureTextWidth } from "@/ui/qr-builder/helpers/measure-text-width.ts";
import CardFirstPreview from "@/ui/qr-builder/icons/frames/card-1-preview.svg";
import CardFirst from "@/ui/qr-builder/icons/frames/card-1.svg";
import CardSecondPreview from "@/ui/qr-builder/icons/frames/card-2-preview.svg";
import CardSecond from "@/ui/qr-builder/icons/frames/card-2.svg";
import CardThirdPreview from "@/ui/qr-builder/icons/frames/card-3-preview.svg";
import CardThird from "@/ui/qr-builder/icons/frames/card-3.svg";
import CardPreview from "@/ui/qr-builder/icons/frames/card-preview.svg";
import Card from "@/ui/qr-builder/icons/frames/card.svg";
import ClipboardFramePreview from "@/ui/qr-builder/icons/frames/clipboard-preview.svg";
import ClipboardFrame from "@/ui/qr-builder/icons/frames/clipboard.svg";
import CoffeeCupPreview from "@/ui/qr-builder/icons/frames/coffee-cup-preview.svg";
import CoffeeCup from "@/ui/qr-builder/icons/frames/coffee-cup.svg";
import EnvelopePreview from "@/ui/qr-builder/icons/frames/envelope-preview.svg";
import Envelope from "@/ui/qr-builder/icons/frames/envelope.svg";
import ScooterPreview from "@/ui/qr-builder/icons/frames/scooter-preview.svg";
import Scooter from "@/ui/qr-builder/icons/frames/scooter.svg";
import WaitressPreview from "@/ui/qr-builder/icons/frames/waitress-preview.svg";
import Waitress from "@/ui/qr-builder/icons/frames/waitress.svg";
import WreathPreview from "@/ui/qr-builder/icons/frames/wreath-preview.svg";
import Wreath from "@/ui/qr-builder/icons/frames/wreath.svg";
import NoLogoIcon from "@/ui/qr-builder/icons/no-logo.svg";
import { StaticImageData } from "next/image";
import { BLACK_COLOR, WHITE_COLOR } from "./colors.ts";
import { TStyleOption } from "./styles.ts";

const frameCache = new Map<string, HTMLElement>();

export const FRAME_TEXT = "Scan Me!";

export const FRAMES: TStyleOption[] = [
  {
    id: "frame-none",
    type: "none",
    icon: NoLogoIcon,
  },
  {
    id: "frame-card",
    type: "card",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, Card, 0.75, 50, 5);
    },
    icon: CardPreview,
  },
  {
    id: "frame-card-1",
    type: "card-1",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, CardFirst, 0.75, 50, 5);
    },
    icon: CardFirstPreview,
  },
  {
    id: "frame-card-2",
    type: "card-2",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, CardSecond, 0.739, 52, 7);
    },
    icon: CardSecondPreview,
    defaultTextColor: BLACK_COLOR,
  },
  {
    id: "frame-card-3",
    type: "card-3",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, CardThird, 0.723, 57, 10);
    },
    icon: CardThirdPreview,
    defaultTextColor: BLACK_COLOR,
  },
  {
    id: "frame-wreath",
    type: "wreath",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, Wreath, 0.65, 81, 40);
    },
    icon: WreathPreview,
  },
  {
    id: "frame-envelope",
    type: "envelope",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, Envelope, 0.52, 138, 25);
    },
    icon: EnvelopePreview,
    defaultTextColor: BLACK_COLOR,
  },
  {
    id: "frame-waitress",
    type: "waitress",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, Waitress, 0.51, 150, 75);
    },
    icon: WaitressPreview,
    defaultTextColor: BLACK_COLOR,
  },
  {
    id: "frame-coffee-cup",
    type: "coffee-cup",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, CoffeeCup, 0.517, 121, 130);
    },
    icon: CoffeeCupPreview,
    defaultTextColor: BLACK_COLOR,
  },
  {
    id: "frame-scooter",
    type: "scooter",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, Scooter, 0.457, 43, 48);
    },
    icon: ScooterPreview,
  },
  {
    id: "frame-clipboard",
    type: "clipboard",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, ClipboardFrame, 0.72, 60, 55);
    },
    icon: ClipboardFramePreview,
  },
];

export async function preloadAllFrames() {
  const framesToLoad = [
    Card,
    CardFirst,
    CardSecond,
    CardThird,
    Wreath,
    Envelope,
    Waitress,
    CoffeeCup,
    Scooter,
    ClipboardFrame,
  ];

  await Promise.all(
    framesToLoad.map(async (frame) => {
      const { src } = frame;
      if (!frameCache.has(src)) {
        try {
          const res = await fetch(src);
          const svgText = await res.text();
          const parsed = new DOMParser().parseFromString(
            svgText,
            "image/svg+xml",
          ).documentElement;
          frameCache.set(src, parsed);
        } catch (err) {
          console.error(`Failed to preload frame SVG: ${src}`, err);
        }
      }
    }),
  );
}

export const isDefaultTextColor = (color: string): boolean => {
  return color === WHITE_COLOR || color === BLACK_COLOR;
};

async function embedQRIntoFrame(
  svg: SVGSVGElement,
  options: {
    width: number;
    height: number;
    frameColor: string;
    frameTextColor: string;
    frameText: string;
    onTextNodeFound?: (node: SVGTextElement) => void;
  },
  frame: StaticImageData,
  qrScale: number,
  qrTranslateX: number,
  qrTranslateY: number,
) {
  const { src } = frame;

  try {
    const frameSvg = frameCache.get(src);
    if (!frameSvg) {
      throw new Error(`Frame SVG not preloaded: ${src}`);
    }

    const frameClone = frameSvg.cloneNode(true) as SVGElement;

    frameClone.setAttribute("width", String(options.width));
    frameClone.setAttribute("height", String(options.height));
    frameClone.setAttribute("color", String(options.frameColor));

    const secondaryColorElement = frameClone.querySelector(
      "#qr-frame-secondary-color",
    ) as SVGElement | null;
    if (secondaryColorElement) {
      secondaryColorElement.setAttribute(
        "fill",
        lightenHexColor(options.frameColor, 20),
      );
    }

    const textNode = frameClone.querySelector(
      "#qr-frame-text",
    ) as SVGTextElement | null;

    if (textNode) {
      textNode.style.fill = options.frameTextColor;
      textNode.textContent = options.frameText || " ";

      const maxWidth = 150;
      const initialFontSizeAttr = textNode.getAttribute("font-size");
      let currentFontSize = initialFontSizeAttr
        ? parseFloat(initialFontSizeAttr)
        : 30;

      if (options.frameText) {
        let width = measureTextWidth(
          options.frameText,
          `${currentFontSize}px Inter`,
        );

        while (width > maxWidth && currentFontSize > 12) {
          currentFontSize -= 1;
          width = measureTextWidth(
            options.frameText,
            `${currentFontSize}px Inter`,
          );
        }

        textNode.textContent = options.frameText;
        textNode.setAttribute("font-size", `${currentFontSize}px`);
        textNode.setAttribute("font-family", "Inter, sans-serif");
      }
    }

    const qrGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    while (svg.firstChild) {
      qrGroup.appendChild(svg.firstChild);
    }

    qrGroup.setAttribute(
      "transform",
      `scale(${qrScale}) translate(${qrTranslateX}, ${qrTranslateY})`,
    );

    svg.appendChild(qrGroup);
    svg.appendChild(frameClone);
  } catch (err) {
    console.error("Failed to embed QR into frame:", err);
  }
}
