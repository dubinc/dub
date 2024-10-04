import qrcodegen from "./codegen";
import {
  DEFAULT_BGCOLOR,
  DEFAULT_FGCOLOR,
  DEFAULT_INCLUDEMARGIN,
  DEFAULT_LEVEL,
  DEFAULT_SIZE,
  ERROR_LEVEL_MAP,
  MARGIN_SIZE,
} from "./constants";
import { QRPropsSVG } from "./types";
import { excavateModules, generatePath, getImageSettings } from "./utils";

export async function getQRAsSVG(props: QRPropsSVG) {
  const {
    value,
    size = DEFAULT_SIZE,
    level = DEFAULT_LEVEL,
    bgColor = DEFAULT_BGCOLOR,
    fgColor = DEFAULT_FGCOLOR,
    includeMargin = DEFAULT_INCLUDEMARGIN,
    imageSettings,
    ...otherProps
  } = props;

  let cells = qrcodegen.QrCode.encodeText(
    value,
    ERROR_LEVEL_MAP[level],
  ).getModules();

  const margin = includeMargin ? MARGIN_SIZE : 0;
  const numCells = cells.length + margin * 2;
  const calculatedImageSettings = getImageSettings(
    cells,
    size,
    includeMargin,
    imageSettings,
  );

  let image = <></>;
  if (imageSettings != null && calculatedImageSettings != null) {
    if (calculatedImageSettings.excavation != null) {
      cells = excavateModules(cells, calculatedImageSettings.excavation);
    }

    const base64Image = await fetch(
      `https://wsrv.nl/?url=${imageSettings.src}&w=100&h=100&encoding=base64`,
    ).then((res) => res.text());

    image = (
      <image
        href={base64Image}
        height={calculatedImageSettings.h}
        width={calculatedImageSettings.w}
        x={calculatedImageSettings.x + margin}
        y={calculatedImageSettings.y + margin}
        preserveAspectRatio="none"
      />
    );
  }

  // Drawing strategy: instead of a rect per module, we're going to create a
  // single path for the dark modules and layer that on top of a light rect,
  // for a total of 2 DOM nodes. We pay a bit more in string concat but that's
  // way faster than DOM ops.
  // For level 1, 441 nodes -> 2
  // For level 40, 31329 -> 2
  const fgPath = generatePath(cells, margin);

  return (
    <svg
      height={size}
      width={size}
      viewBox={`0 0 ${numCells} ${numCells}`}
      xmlns="http://www.w3.org/2000/svg"
      {...otherProps}
    >
      <path
        fill={bgColor}
        d={`M0,0 h${numCells}v${numCells}H0z`}
        shapeRendering="crispEdges"
      />
      <path fill={fgColor} d={fgPath} shapeRendering="crispEdges" />
      {image}
    </svg>
  );
}
