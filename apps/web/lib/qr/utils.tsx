import qrcodegen from "./codegen";
import {
  DEFAULT_BGCOLOR,
  DEFAULT_FGCOLOR,
  DEFAULT_IMG_SCALE,
  DEFAULT_LEVEL,
  DEFAULT_MARGIN,
  DEFAULT_SIZE,
  ERROR_LEVEL_MAP,
} from "./constants";
import {
  Excavation,
  ImageSettings,
  MarkerBorderStyle,
  MarkerCenterStyle,
  Modules,
  QRPropsSVG,
} from "./types";

import type { JSX } from "react";

// We could just do this in generatePath, except that we want to support
// non-Path2D canvas, so we need to keep it an explicit step.
export function excavateModules(
  modules: Modules,
  excavation: Excavation,
): Modules {
  return modules.slice().map((row, y) => {
    if (y < excavation.y || y >= excavation.y + excavation.h) {
      return row;
    }
    return row.map((cell, x) => {
      if (x < excavation.x || x >= excavation.x + excavation.w) {
        return cell;
      }
      return false;
    });
  });
}

/**
 * Returns true if the cell at (x, y) belongs to one of the three 7×7 finder
 * pattern zones in the QR code corners. numModules is the raw module count
 * (without margin).
 */
export function isFinderPatternCell(
  x: number,
  y: number,
  numModules: number,
): boolean {
  return (
    (x < 7 && y < 7) || // top-left
    (x >= numModules - 7 && y < 7) || // top-right
    (x < 7 && y >= numModules - 7) // bottom-left
  );
}

/**
 * Generates an SVG path string for all dark data modules, skipping the three
 * finder pattern regions. Uses the same batched run-length approach as before
 * for maximum efficiency.
 */
export function generateSquareDotPath(modules: Modules, margin = 0): string {
  const numModules = modules.length;
  const ops: Array<string> = [];
  modules.forEach(function (row, y) {
    // Skip finder pattern rows entirely where possible — still check per cell
    // so the separator white modules are handled correctly.
    let start: number | null = null;
    row.forEach(function (cell, x) {
      const isFinder = isFinderPatternCell(x, y, numModules);

      // If we hit a non-dark cell or a finder cell, close any open run.
      if ((!cell || isFinder) && start !== null) {
        ops.push(
          `M${start + margin} ${y + margin}h${x - start}v1H${start + margin}z`,
        );
        start = null;
        return;
      }

      if (x === row.length - 1) {
        if (!cell || isFinder) {
          return;
        }
        if (start === null) {
          ops.push(`M${x + margin},${y + margin} h1v1H${x + margin}z`);
        } else {
          ops.push(
            `M${start + margin},${y + margin} h${x + 1 - start}v1H${
              start + margin
            }z`,
          );
        }
        return;
      }

      if (cell && !isFinder && start === null) {
        start = x;
      }
    });
  });
  return ops.join("");
}

/**
 * Generates an SVG path string for all dark data modules as rounded squares
 * (close to circles), skipping finder pattern cells.
 */
export function generateRoundedDotPath(modules: Modules, margin = 0): string {
  const numModules = modules.length;
  const r = 0.4; // corner radius — fraction of module size
  const ops: Array<string> = [];

  modules.forEach(function (row, y) {
    row.forEach(function (cell, x) {
      if (!cell || isFinderPatternCell(x, y, numModules)) return;

      const cx = x + margin;
      const cy = y + margin;
      // Rounded-rectangle arc path for a 1×1 module
      ops.push(
        `M${cx + r},${cy}` +
          `h${1 - 2 * r}` +
          `a${r},${r} 0 0 1 ${r},${r}` +
          `v${1 - 2 * r}` +
          `a${r},${r} 0 0 1 ${-r},${r}` +
          `h${-(1 - 2 * r)}` +
          `a${r},${r} 0 0 1 ${-r},${-r}` +
          `v${-(1 - 2 * r)}` +
          `a${r},${r} 0 0 1 ${r},${-r}` +
          `z`,
      );
    });
  });

  return ops.join("");
}

/**
 * Draws a rectangle where each of the four corners can have an independent
 * radius (0 = sharp right angle, r = quarter-circle arc).
 */
function cornerRoundedRect(
  x: number,
  y: number,
  w: number,
  h: number,
  rTL: number,
  rTR: number,
  rBR: number,
  rBL: number,
): string {
  const parts: string[] = [];
  parts.push(`M${x + rTL},${y}`);

  if (rTR > 0) {
    parts.push(`H${x + w - rTR}`);
    parts.push(`A${rTR},${rTR} 0 0 1 ${x + w},${y + rTR}`);
  } else {
    parts.push(`H${x + w}`);
  }

  if (rBR > 0) {
    parts.push(`V${y + h - rBR}`);
    parts.push(`A${rBR},${rBR} 0 0 1 ${x + w - rBR},${y + h}`);
  } else {
    parts.push(`V${y + h}`);
  }

  if (rBL > 0) {
    parts.push(`H${x + rBL}`);
    parts.push(`A${rBL},${rBL} 0 0 1 ${x},${y + h - rBL}`);
  } else {
    parts.push(`H${x}`);
  }

  if (rTL > 0) {
    parts.push(`V${y + rTL}`);
    parts.push(`A${rTL},${rTL} 0 0 1 ${x + rTL},${y}`);
  } else {
    parts.push(`V${y}`);
  }

  parts.push("Z");
  return parts.join("");
}

/**
 * "Extra-rounded" / connected style: each module checks its 4 neighbours.
 * Corners that touch a dark neighbour are kept sharp; free corners get a
 * full r=0.5 arc — so isolated cells become perfect circles, horizontal
 * pairs become pills, and L/T-shapes flow into smooth organic forms.
 */
export function generateExtraRoundedDotPath(
  modules: Modules,
  margin = 0,
): string {
  const numModules = modules.length;
  const r = 0.5;
  const ops: string[] = [];

  const isDark = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= numModules || y >= numModules) return false;
    return !!(modules[y][x] && !isFinderPatternCell(x, y, numModules));
  };

  modules.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (!cell || isFinderPatternCell(x, y, numModules)) return;

      const px = x + margin;
      const py = y + margin;

      const top = isDark(x, y - 1);
      const right = isDark(x + 1, y);
      const bottom = isDark(x, y + 1);
      const left = isDark(x - 1, y);

      ops.push(
        cornerRoundedRect(
          px,
          py,
          1,
          1,
          top || left ? 0 : r, // TL
          top || right ? 0 : r, // TR
          bottom || right ? 0 : r, // BR
          bottom || left ? 0 : r, // BL
        ),
      );
    });
  });

  return ops.join("");
}

/**
 * Legacy path generator kept for use by canvas and SVG download helpers that
 * haven't been updated yet. Renders ALL dark modules as squares (no finder
 * exclusion). Use the named generators above for new code.
 */
export function generatePath(modules: Modules, margin = 0): string {
  const ops: Array<string> = [];
  modules.forEach(function (row, y) {
    let start: number | null = null;
    row.forEach(function (cell, x) {
      if (!cell && start !== null) {
        ops.push(
          `M${start + margin} ${y + margin}h${x - start}v1H${start + margin}z`,
        );
        start = null;
        return;
      }

      if (x === row.length - 1) {
        if (!cell) {
          return;
        }
        if (start === null) {
          ops.push(`M${x + margin},${y + margin} h1v1H${x + margin}z`);
        } else {
          ops.push(
            `M${start + margin},${y + margin} h${x + 1 - start}v1H${
              start + margin
            }z`,
          );
        }
        return;
      }

      if (cell && start === null) {
        start = x;
      }
    });
  });
  return ops.join("");
}

export function getImageSettings(
  cells: Modules,
  size: number,
  margin: number,
  imageSettings?: ImageSettings,
): null | {
  x: number;
  y: number;
  h: number;
  w: number;
  excavation: Excavation | null;
} {
  if (imageSettings == null) {
    return null;
  }

  const qrCodeSize = cells.length;
  const defaultSize = Math.floor(size * DEFAULT_IMG_SCALE);
  const scale = qrCodeSize / size;
  const w = (imageSettings.width || defaultSize) * scale;
  const h = (imageSettings.height || defaultSize) * scale;

  const x =
    imageSettings.x == null ? qrCodeSize / 2 - w / 2 : imageSettings.x * scale;
  const y =
    imageSettings.y == null ? qrCodeSize / 2 - h / 2 : imageSettings.y * scale;

  let excavation: Excavation | null = null;
  if (imageSettings.excavate) {
    const floorX = Math.floor(x);
    const floorY = Math.floor(y);
    const ceilW = Math.ceil(w + x - floorX);
    const ceilH = Math.ceil(h + y - floorY);
    excavation = { x: floorX, y: floorY, w: ceilW, h: ceilH };
  }

  return { x, y, h, w, excavation };
}

export function convertImageSettingsToPixels(
  calculatedImageSettings: {
    x: number;
    y: number;
    w: number;
    h: number;
    excavation: Excavation | null;
  },
  size: number,
  numCells: number,
  margin: number,
) {
  const pixelRatio = size / numCells;
  const imgWidth = calculatedImageSettings.w * pixelRatio;
  const imgHeight = calculatedImageSettings.h * pixelRatio;
  const imgLeft = (calculatedImageSettings.x + margin) * pixelRatio;
  const imgTop = (calculatedImageSettings.y + margin) * pixelRatio;

  return { imgWidth, imgHeight, imgLeft, imgTop };
}

// ─── SVG path helpers for compound finder-pattern shapes ─────────────────────

/** Closed SVG path for a rounded rectangle. */
function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  return (
    `M${x + r},${y}` +
    `H${x + w - r}` +
    `A${r},${r} 0 0 1 ${x + w},${y + r}` +
    `V${y + h - r}` +
    `A${r},${r} 0 0 1 ${x + w - r},${y + h}` +
    `H${x + r}` +
    `A${r},${r} 0 0 1 ${x},${y + h - r}` +
    `V${y + r}` +
    `A${r},${r} 0 0 1 ${x + r},${y}` +
    `Z`
  );
}

/** Closed SVG path for a circle (two half-arc moves). */
function circlePath(cx: number, cy: number, r: number): string {
  return (
    `M${cx - r},${cy}` +
    `A${r},${r} 0 1 0 ${cx + r},${cy}` +
    `A${r},${r} 0 1 0 ${cx - r},${cy}` +
    `Z`
  );
}

/**
 * Returns a compound SVG path for the finder-pattern border ring using the
 * evenodd fill rule, so the gap is transparent (no white rectangle needed).
 */
function finderBorderPath(
  x: number,
  y: number,
  borderStyle: MarkerBorderStyle,
): string {
  const cx = x + 3.5;
  const cy = y + 3.5;

  if (borderStyle === "square") {
    const outer = `M${x},${y}H${x + 7}V${y + 7}H${x}Z`;
    const inner = `M${x + 1},${y + 1}H${x + 6}V${y + 6}H${x + 1}Z`;
    return `${outer} ${inner}`;
  }

  if (borderStyle === "rounded-square") {
    const outer = roundedRectPath(x, y, 7, 7, 1.5);
    // Inner cutout uses a smaller radius so corners look intentional
    const inner = roundedRectPath(x + 1, y + 1, 5, 5, 0.75);
    return `${outer} ${inner}`;
  }

  // circle
  const outer = circlePath(cx, cy, 3.5);
  const inner = circlePath(cx, cy, 2.5);
  return `${outer} ${inner}`;
}

/**
 * Renders a single finder pattern (7×7 zone) at the given top-left corner
 * position (in module coordinates, already including margin).
 *
 * Uses fill-rule="evenodd" so the border ring gap is transparent — no
 * background-coloured rectangle is painted, which avoids the hard-cornered
 * white square that looks bad on rounded / circle border styles.
 */
function FinderPattern({
  x,
  y,
  markerColor,
  borderStyle = "square",
  centerStyle = "square",
}: {
  x: number;
  y: number;
  markerColor: string;
  bgColor: string; // kept in signature for API stability; not needed with evenodd
  borderStyle?: MarkerBorderStyle;
  centerStyle?: MarkerCenterStyle;
}): JSX.Element {
  const cx = x + 3.5;
  const cy = y + 3.5;
  const borderPath = finderBorderPath(x, y, borderStyle);

  return (
    <g>
      {/* Border ring — compound path punches a transparent hole via evenodd */}
      <path d={borderPath} fill={markerColor} fillRule="evenodd" />

      {/* Inner center */}
      {centerStyle === "square" && (
        <rect
          x={x + 2}
          y={y + 2}
          width={3}
          height={3}
          fill={markerColor}
          shapeRendering="crispEdges"
        />
      )}
      {centerStyle === "circle" && (
        <circle cx={cx} cy={cy} r={1.5} fill={markerColor} />
      )}
    </g>
  );
}

export function QRCodeSVG(props: QRPropsSVG) {
  const {
    value,
    size = DEFAULT_SIZE,
    level = DEFAULT_LEVEL,
    bgColor = DEFAULT_BGCOLOR,
    fgColor = DEFAULT_FGCOLOR,
    margin = DEFAULT_MARGIN,
    isOGContext = false,
    imageSettings,
    dotStyle = "square",
    markerCenterStyle = "square",
    markerBorderStyle = "square",
    markerColor,
    ...otherProps
  } = props;

  const effectiveMarkerColor = markerColor ?? fgColor;

  const shouldUseHigherErrorLevel =
    isOGContext && imageSettings?.excavate && (level === "L" || level === "M");

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

  let image: null | JSX.Element = null;
  if (imageSettings != null && calculatedImageSettings != null) {
    if (calculatedImageSettings.excavation != null) {
      cells = excavateModules(cells, calculatedImageSettings.excavation);
    }

    if (isOGContext) {
      const { imgWidth, imgHeight, imgLeft, imgTop } =
        convertImageSettingsToPixels(
          calculatedImageSettings,
          size,
          numCells,
          margin,
        );

      image = (
        <img
          src={imageSettings.src}
          alt="Logo"
          style={{
            position: "absolute",
            left: `${imgLeft}px`,
            top: `${imgTop}px`,
            width: `${imgWidth}px`,
            height: `${imgHeight}px`,
          }}
        />
      );
    } else {
      image = (
        <image
          href={imageSettings.src}
          height={calculatedImageSettings.h}
          width={calculatedImageSettings.w}
          x={calculatedImageSettings.x + margin}
          y={calculatedImageSettings.y + margin}
          preserveAspectRatio="none"
        />
      );
    }
  }

  const fgPath =
    dotStyle === "rounded"
      ? generateRoundedDotPath(cells, margin)
      : dotStyle === "extra-rounded"
        ? generateExtraRoundedDotPath(cells, margin)
        : generateSquareDotPath(cells, margin);

  // The three finder pattern top-left corners in module coordinates (+ margin)
  const numModules = cells.length;
  const finderPositions = [
    { x: margin, y: margin }, // top-left
    { x: numModules - 7 + margin, y: margin }, // top-right
    { x: margin, y: numModules - 7 + margin }, // bottom-left
  ];

  return (
    <svg
      height={size}
      width={size}
      viewBox={`0 0 ${numCells} ${numCells}`}
      {...otherProps}
    >
      <path
        fill={bgColor}
        d={`M0,0 h${numCells}v${numCells}H0z`}
        shapeRendering="crispEdges"
      />
      <path fill={fgColor} d={fgPath} shapeRendering="crispEdges" />
      {finderPositions.map((pos, i) => (
        <FinderPattern
          key={i}
          x={pos.x}
          y={pos.y}
          markerColor={effectiveMarkerColor}
          bgColor={bgColor}
          borderStyle={markerBorderStyle}
          centerStyle={markerCenterStyle}
        />
      ))}
      {image}
    </svg>
  );
}

// For canvas we're going to switch our drawing mode based on whether or not
// the environment supports Path2D. We only need the constructor to be
// supported, but Edge doesn't actually support the path (string) type
// argument. Luckily it also doesn't support the addPath() method. We can
// treat that as the same thing.
export const SUPPORTS_PATH2D = (function () {
  try {
    new Path2D().addPath(new Path2D());
  } catch (e) {
    return false;
  }
  return true;
})();
