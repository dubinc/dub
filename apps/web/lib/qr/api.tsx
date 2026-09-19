import qrcodegen from "./codegen";
import {
  DEFAULT_FGCOLOR,
  DEFAULT_LEVEL,
  DEFAULT_MARGIN,
  DEFAULT_SIZE,
  ERROR_LEVEL_MAP,
} from "./constants";
import { QRPropsSVG } from "./types";
import { excavateModules, generatePath, getImageSettings } from "./utils";

export async function getQRAsSVG(props: QRPropsSVG): Promise<string> {
  const {
    value,
    size = DEFAULT_SIZE,
    level = DEFAULT_LEVEL,
    bgColor,
    fgColor = DEFAULT_FGCOLOR,
    margin = DEFAULT_MARGIN,
    imageSettings,
  } = props;

  const shouldUseHigherErrorLevel =
    imageSettings?.excavate && (level === "L" || level === "M");

  const effectiveLevel = shouldUseHigherErrorLevel ? "Q" : level;

  let cells = qrcodegen.QrCode.encodeText(
    value,
    ERROR_LEVEL_MAP[effectiveLevel],
  ).getModules();

  const numCells = cells.length + margin * 2;
  const calculatedImageSettings = getImageSettings(
    cells,
    size,
    margin,
    imageSettings,
  );

  let image = "";
  if (imageSettings != null && calculatedImageSettings != null) {
    try {
      const base64Image = await fetch(
        `https://wsrv.nl/?url=${encodeURIComponent(imageSettings.src)}&w=100&h=100&encoding=base64`,
        { signal: AbortSignal.timeout(5_000) },
      ).then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch logo: ${res.status}`);
        }
        return res.text();
      });

      if (calculatedImageSettings.excavation != null) {
        cells = excavateModules(cells, calculatedImageSettings.excavation);
      }

      image = [
        `<image href="${base64Image}"`,
        `height="${calculatedImageSettings.h}"`,
        `width="${calculatedImageSettings.w}"`,
        `x="${calculatedImageSettings.x + margin}"`,
        `y="${calculatedImageSettings.y + margin}"`,
        'preserveAspectRatio="none"></image>',
      ].join(" ");
    } catch {
      // Omit logo if embedding fails; still return a valid QR SVG.
    }
  }

  // Drawing strategy: instead of a rect per module, we're going to create a
  // single path for the dark modules. Background is only painted when bgColor
  // is set — otherwise the SVG stays transparent.
  const fgPath = generatePath(cells, margin);
  const bgPath = bgColor
    ? `<path fill="${bgColor}" d="M0,0 h${numCells}v${numCells}H0z" shape-rendering="crispEdges"></path>`
    : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" height="${size}" width="${size}" viewBox="0 0 ${numCells} ${numCells}">`,
    bgPath,
    `<path fill="${fgColor}" d="${fgPath}" shape-rendering="crispEdges"></path>`,
    image,
    "</svg>",
  ].join("");
}
