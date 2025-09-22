import { StaticImageData } from "next/image";

// Frame cache functionality
export const frameMemoryCache = new Map<string, SVGElement>();

export const loadAndCacheFrame = async (frame: StaticImageData): Promise<SVGElement | null> => {
  const { src } = frame;
  
  if (frameMemoryCache.has(src)) {
    return frameMemoryCache.get(src)!;
  }

  try {
    const response = await fetch(src);
    const svgText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, "image/svg+xml");
    const svgElement = doc.querySelector("svg") as SVGElement;
    
    if (svgElement) {
      frameMemoryCache.set(src, svgElement);
      return svgElement;
    }
    return null;
  } catch (error) {
    console.error(`Failed to load frame: ${src}`, error);
    return null;
  }
};

// Helper functions
export const lightenHexColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const B = (num >> 8 & 0x00FF) + amt;
  const G = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (B < 255 ? B < 1 ? 0 : B : 255) * 0x100 + (G < 255 ? G < 1 ? 0 : G : 255)).toString(16).slice(1);
};

export const measureTextWidth = (text: string, font: string): number => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return 0;
  context.font = font;
  return context.measureText(text).width;
};

export async function embedQRIntoFrame(
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
    let frameSvg = frameMemoryCache.get(src);
    if (!frameSvg) {
      const loadedFrame = await loadAndCacheFrame(frame);
      if (!loadedFrame) {
        throw new Error(`Failed to load frame SVG: ${src}`);
      }
      frameSvg = loadedFrame;
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