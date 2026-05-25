/**
 * @license qrcode.react
 * Copyright (c) Paul O'Shannessy
 * SPDX-License-Identifier: ISC
 */
import { DUB_QR_LOGO } from "@dub/utils/src/constants";
import { useEffect, useRef, useState, type JSX } from "react";
import qrcodegen from "./codegen";
import {
  DEFAULT_BGCOLOR,
  DEFAULT_FGCOLOR,
  DEFAULT_LEVEL,
  DEFAULT_MARGIN,
  DEFAULT_SIZE,
  ERROR_LEVEL_MAP,
} from "./constants";
import {
  DotStyle,
  MarkerBorderStyle,
  MarkerCenterStyle,
  QRProps,
  QRPropsCanvas,
} from "./types";
import {
  SUPPORTS_PATH2D,
  excavateModules,
  generateExtraRoundedDotPath,
  generatePath,
  generateRoundedDotPath,
  generateSquareDotPath,
  getImageSettings,
  isFinderPatternCell,
} from "./utils";
export * from "./types";
export * from "./utils";

export function QRCodeCanvas(props: QRPropsCanvas) {
  const {
    value,
    size = DEFAULT_SIZE,
    level = DEFAULT_LEVEL,
    bgColor = DEFAULT_BGCOLOR,
    fgColor = DEFAULT_FGCOLOR,
    margin = DEFAULT_MARGIN,
    style,
    imageSettings,
    ...otherProps
  } = props;
  const imgSrc = imageSettings?.src;
  const _canvas = useRef<HTMLCanvasElement>(null);
  const _image = useRef<HTMLImageElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isImgLoaded, setIsImageLoaded] = useState(false);

  useEffect(() => {
    if (_canvas.current != null) {
      const canvas = _canvas.current;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      let cells = qrcodegen.QrCode.encodeText(
        value,
        ERROR_LEVEL_MAP[level],
      ).getModules();

      const numCells = cells.length + margin * 2;
      const calculatedImageSettings = getImageSettings(
        cells,
        size,
        margin,
        imageSettings,
      );

      const image = _image.current;
      const haveImageToRender =
        calculatedImageSettings != null &&
        image !== null &&
        image.complete &&
        image.naturalHeight !== 0 &&
        image.naturalWidth !== 0;

      if (haveImageToRender) {
        if (calculatedImageSettings.excavation != null) {
          cells = excavateModules(cells, calculatedImageSettings.excavation);
        }
      }

      const pixelRatio = window.devicePixelRatio || 1;
      canvas.height = canvas.width = size * pixelRatio;
      const scale = (size / numCells) * pixelRatio;
      ctx.scale(scale, scale);

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, numCells, numCells);

      ctx.fillStyle = fgColor;
      if (SUPPORTS_PATH2D) {
        ctx.fill(new Path2D(generatePath(cells, margin)));
      } else {
        cells.forEach(function (row, rdx) {
          row.forEach(function (cell, cdx) {
            if (cell) {
              ctx.fillRect(cdx + margin, rdx + margin, 1, 1);
            }
          });
        });
      }

      if (haveImageToRender) {
        ctx.drawImage(
          image,
          calculatedImageSettings.x + margin,
          calculatedImageSettings.y + margin,
          calculatedImageSettings.w,
          calculatedImageSettings.h,
        );
      }
    }
  });

  useEffect(() => {
    setIsImageLoaded(false);
  }, [imgSrc]);

  const canvasStyle = { height: size, width: size, ...style };
  let img: JSX.Element | null = null;
  if (imgSrc != null) {
    img = (
      <img
        alt="QR code"
        src={imgSrc}
        key={imgSrc}
        style={{ display: "none" }}
        onLoad={() => {
          setIsImageLoaded(true);
        }}
        ref={_image}
      />
    );
  }
  return (
    <>
      <canvas
        style={canvasStyle}
        height={size}
        width={size}
        ref={_canvas}
        {...otherProps}
      />
      {img}
    </>
  );
}

// ─── SVG string helpers for download ─────────────────────────────────────────

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

function circlePath(cx: number, cy: number, r: number): string {
  return (
    `M${cx - r},${cy}` +
    `A${r},${r} 0 1 0 ${cx + r},${cy}` +
    `A${r},${r} 0 1 0 ${cx - r},${cy}` +
    `Z`
  );
}

function finderBorderPathString(
  x: number,
  y: number,
  borderStyle: MarkerBorderStyle,
): string {
  const cx = x + 3.5;
  const cy = y + 3.5;
  if (borderStyle === "square") {
    return (
      `M${x},${y}H${x + 7}V${y + 7}H${x}Z ` +
      `M${x + 1},${y + 1}H${x + 6}V${y + 6}H${x + 1}Z`
    );
  }
  if (borderStyle === "rounded-square") {
    return (
      roundedRectPath(x, y, 7, 7, 1.5) +
      " " +
      roundedRectPath(x + 1, y + 1, 5, 5, 0.75)
    );
  }
  return circlePath(cx, cy, 3.5) + " " + circlePath(cx, cy, 2.5);
}

function getFinderPatternSVGString({
  x,
  y,
  markerColor,
  borderStyle = "square",
  centerStyle = "square",
}: {
  x: number;
  y: number;
  markerColor: string;
  bgColor: string;
  borderStyle?: MarkerBorderStyle;
  centerStyle?: MarkerCenterStyle;
}): string {
  const cx = x + 3.5;
  const cy = y + 3.5;

  const borderPath = finderBorderPathString(x, y, borderStyle);
  const border = `<path d="${borderPath}" fill="${markerColor}" fill-rule="evenodd"></path>`;

  const center =
    centerStyle === "square"
      ? `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="${markerColor}" shape-rendering="crispEdges"></rect>`
      : `<circle cx="${cx}" cy="${cy}" r="1.5" fill="${markerColor}"></circle>`;

  return `<g>${border}${center}</g>`;
}

// ─── Canvas helpers for finder patterns ──────────────────────────────────────

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fill();
}

function drawCanvasFinderPattern(
  ctx: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  markerColor: string,
  bgColor: string,
  borderStyle: MarkerBorderStyle = "square",
  centerStyle: MarkerCenterStyle = "square",
) {
  const cx = fx + 3.5;
  const cy = fy + 3.5;

  // Draw outer border shape
  ctx.fillStyle = markerColor;
  if (borderStyle === "square") {
    ctx.fillRect(fx, fy, 7, 7);
  } else if (borderStyle === "rounded-square") {
    drawRoundedRect(ctx, fx, fy, 7, 7, 1.5);
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Punch the gap in a shape that matches the border style
  ctx.fillStyle = bgColor;
  if (borderStyle === "square") {
    ctx.fillRect(fx + 1, fy + 1, 5, 5);
  } else if (borderStyle === "rounded-square") {
    drawRoundedRect(ctx, fx + 1, fy + 1, 5, 5, 0.75);
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw inner center
  ctx.fillStyle = markerColor;
  if (centerStyle === "square") {
    ctx.fillRect(fx + 2, fy + 2, 3, 3);
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Public download helpers ──────────────────────────────────────────────────

export async function getQRAsSVGDataUri(props: QRProps) {
  const {
    value,
    size = DEFAULT_SIZE,
    level = DEFAULT_LEVEL,
    bgColor = DEFAULT_BGCOLOR,
    fgColor = DEFAULT_FGCOLOR,
    margin = DEFAULT_MARGIN,
    imageSettings,
    dotStyle = "square",
    markerCenterStyle = "square",
    markerBorderStyle = "square",
    markerColor,
  } = props;

  const effectiveMarkerColor = markerColor ?? fgColor;

  let cells = qrcodegen.QrCode.encodeText(
    value,
    ERROR_LEVEL_MAP[level],
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
    if (calculatedImageSettings.excavation != null)
      cells = excavateModules(cells, calculatedImageSettings.excavation);

    const base64Image = await getBase64Image(imageSettings.src);

    image = [
      `<image href="${base64Image}"`,
      `height="${calculatedImageSettings.h}"`,
      `width="${calculatedImageSettings.w}"`,
      `x="${calculatedImageSettings.x + margin}"`,
      `y="${calculatedImageSettings.y + margin}"`,
      'preserveAspectRatio="none"></image>',
    ].join(" ");
  }

  const fgPath =
    dotStyle === "rounded"
      ? generateRoundedDotPath(cells, margin)
      : dotStyle === "extra-rounded"
        ? generateExtraRoundedDotPath(cells, margin)
        : generateSquareDotPath(cells, margin);

  const numModules = cells.length;
  const finderPositions = [
    { x: margin, y: margin },
    { x: numModules - 7 + margin, y: margin },
    { x: margin, y: numModules - 7 + margin },
  ];

  const finderSVG = finderPositions
    .map((pos) =>
      getFinderPatternSVGString({
        x: pos.x,
        y: pos.y,
        markerColor: effectiveMarkerColor,
        bgColor,
        borderStyle: markerBorderStyle,
        centerStyle: markerCenterStyle,
      }),
    )
    .join("");

  const svgData = [
    `<svg xmlns="http://www.w3.org/2000/svg" height="${size}" width="${size}" viewBox="0 0 ${numCells} ${numCells}">`,
    `<path fill="${bgColor}" d="M0,0 h${numCells}v${numCells}H0z" shape-rendering="crispEdges"></path>`,
    `<path fill="${fgColor}" d="${fgPath}" shape-rendering="crispEdges"></path>`,
    finderSVG,
    image,
    "</svg>",
  ].join("");

  return `data:image/svg+xml,${encodeURIComponent(svgData)}`;
}

const getBase64Image = (imgUrl: string) => {
  return new Promise(function (resolve, reject) {
    const img = new Image();
    img.src = imgUrl;
    img.setAttribute("crossOrigin", "anonymous");

    img.onload = function () {
      const canvas = document.createElement("canvas");

      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);

      const dataURL = canvas.toDataURL("image/png");
      resolve(dataURL);
    };

    img.onerror = function () {
      reject("The image could not be loaded.");
    };
  });
};

function waitUntilImageLoaded(img: HTMLImageElement, src: string) {
  return new Promise((resolve) => {
    function onFinish() {
      img.onload = null;
      img.onerror = null;
      resolve(true);
    }
    img.onload = onFinish;
    img.onerror = onFinish;
    img.src = src;
    img.loading = "eager";
  });
}

export async function getQRAsCanvas(
  props: QRProps,
  type: string,
  getCanvas?: boolean,
): Promise<HTMLCanvasElement | string> {
  const {
    value,
    size = DEFAULT_SIZE,
    level = DEFAULT_LEVEL,
    bgColor = DEFAULT_BGCOLOR,
    fgColor = DEFAULT_FGCOLOR,
    margin = DEFAULT_MARGIN,
    imageSettings,
    dotStyle = "square",
    markerCenterStyle = "square",
    markerBorderStyle = "square",
    markerColor,
  } = props;

  const effectiveMarkerColor = markerColor ?? fgColor;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  let cells = qrcodegen.QrCode.encodeText(
    value,
    ERROR_LEVEL_MAP[level],
  ).getModules();
  const numCells = cells.length + margin * 2;
  const calculatedImageSettings = getImageSettings(
    cells,
    size,
    margin,
    imageSettings,
  );

  const image = new Image();
  image.crossOrigin = "anonymous";
  if (calculatedImageSettings) {
    // @ts-expect-error: imageSettings is not null
    await waitUntilImageLoaded(image, imageSettings.src);
    if (calculatedImageSettings.excavation != null) {
      cells = excavateModules(cells, calculatedImageSettings.excavation);
    }
  }

  const pixelRatio = window.devicePixelRatio || 1;
  canvas.height = canvas.width = size * pixelRatio;
  const scale = (size / numCells) * pixelRatio;
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, numCells, numCells);

  // Data dots (excluding finder pattern cells)
  ctx.fillStyle = fgColor;
  if (dotStyle === "rounded") {
    const r = 0.4;
    cells.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (!cell || isFinderPatternCell(x, y, cells.length)) return;
        const px = x + margin;
        const py = y + margin;
        drawRoundedRect(ctx, px, py, 1, 1, r);
      });
    });
  } else if (dotStyle === "extra-rounded") {
    const r = 0.5;
    const n = cells.length;
    const isDark = (xi: number, yi: number) =>
      xi >= 0 &&
      yi >= 0 &&
      xi < n &&
      yi < n &&
      !!(cells[yi][xi] && !isFinderPatternCell(xi, yi, n));

    cells.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (!cell || isFinderPatternCell(x, y, n)) return;

        const px = x + margin;
        const py = y + margin;
        const top = isDark(x, y - 1);
        const right = isDark(x + 1, y);
        const bottom = isDark(x, y + 1);
        const left = isDark(x - 1, y);

        // Draw as a rounded rect where connected sides have no arc
        const rTL = top || left ? 0 : r;
        const rTR = top || right ? 0 : r;
        const rBR = bottom || right ? 0 : r;
        const rBL = bottom || left ? 0 : r;

        ctx.beginPath();
        ctx.moveTo(px + rTL, py);
        ctx.lineTo(px + 1 - rTR, py);
        if (rTR > 0) ctx.arcTo(px + 1, py, px + 1, py + rTR, rTR);
        ctx.lineTo(px + 1, py + 1 - rBR);
        if (rBR > 0) ctx.arcTo(px + 1, py + 1, px + 1 - rBR, py + 1, rBR);
        ctx.lineTo(px + rBL, py + 1);
        if (rBL > 0) ctx.arcTo(px, py + 1, px, py + 1 - rBL, rBL);
        ctx.lineTo(px, py + rTL);
        if (rTL > 0) ctx.arcTo(px, py, px + rTL, py, rTL);
        ctx.closePath();
        ctx.fill();
      });
    });
  } else {
    if (SUPPORTS_PATH2D) {
      ctx.fill(new Path2D(generateSquareDotPath(cells, margin)));
    } else {
      cells.forEach((row, rdx) => {
        row.forEach((cell, cdx) => {
          if (cell && !isFinderPatternCell(cdx, rdx, cells.length)) {
            ctx.fillRect(cdx + margin, rdx + margin, 1, 1);
          }
        });
      });
    }
  }

  // Finder patterns
  const numModules = cells.length;
  const finderPositions = [
    { x: margin, y: margin },
    { x: numModules - 7 + margin, y: margin },
    { x: margin, y: numModules - 7 + margin },
  ];

  finderPositions.forEach(({ x, y }) => {
    drawCanvasFinderPattern(
      ctx,
      x,
      y,
      effectiveMarkerColor,
      bgColor,
      markerBorderStyle,
      markerCenterStyle,
    );
  });

  const haveImageToRender =
    calculatedImageSettings != null &&
    image !== null &&
    image.complete &&
    image.naturalHeight !== 0 &&
    image.naturalWidth !== 0;
  if (haveImageToRender) {
    ctx.drawImage(
      image,
      calculatedImageSettings.x + margin,
      calculatedImageSettings.y + margin,
      calculatedImageSettings.w,
      calculatedImageSettings.h,
    );
  }

  if (getCanvas) return canvas;

  const url = canvas.toDataURL(type, 1.0);
  canvas.remove();
  image.remove();
  return url;
}

export function getQRData({
  url,
  fgColor,
  hideLogo,
  logo,
  margin,
  dotStyle,
  markerCenterStyle,
  markerBorderStyle,
  markerColor,
}: {
  url: string;
  fgColor?: string;
  hideLogo?: boolean;
  logo?: string;
  margin?: number;
  dotStyle?: DotStyle;
  markerCenterStyle?: MarkerCenterStyle;
  markerBorderStyle?: MarkerBorderStyle;
  markerColor?: string;
}) {
  return {
    value: `${url}?qr=1`,
    bgColor: "#ffffff",
    fgColor,
    size: 1024,
    level: "Q",
    hideLogo,
    margin,
    dotStyle,
    markerCenterStyle,
    markerBorderStyle,
    markerColor,
    ...(!hideLogo && {
      imageSettings: {
        src: logo || DUB_QR_LOGO,
        height: 256,
        width: 256,
        excavate: true,
      },
    }),
  };
}
