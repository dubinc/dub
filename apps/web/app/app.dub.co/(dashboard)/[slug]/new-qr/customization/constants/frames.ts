import { StaticImageData } from "next/image";
import CoffeeCupPreview from "../icons/frames/coffee-cup-preview.svg";
import CoffeeCup from "../icons/frames/coffee-cup.svg";
import ScooterPreview from "../icons/frames/scooter-preview.svg";
import Scooter from "../icons/frames/scooter.svg";
import NoLogoIcon from "../icons/no-logo.svg";
import { TStyleOption } from "./styles.ts";

const frameCache = new Map<string, HTMLElement>();

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

export async function preloadAllFrames() {
  const framesToLoad = [CoffeeCup, Scooter];

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
    const frameSvg = frameCache.get(src);
    if (!frameSvg) {
      throw new Error(`Frame SVG not preloaded: ${src}`);
    }

    const frameClone = frameSvg.cloneNode(true) as SVGElement;

    frameClone.setAttribute("width", String(options.width));
    frameClone.setAttribute("height", String(options.height));

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
