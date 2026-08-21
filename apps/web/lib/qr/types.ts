import type { CSSProperties } from "react";
import qrcodegen from "./codegen";

export type Modules = ReturnType<qrcodegen.QrCode["getModules"]>;
export type Excavation = { x: number; y: number; w: number; h: number };

export type DotStyle = "square" | "rounded" | "extra-rounded";
export type MarkerCenterStyle = "square" | "circle";
export type MarkerBorderStyle = "square" | "rounded-square" | "circle";

export type QRCodeDesign = {
  fgColor: string;
  hideLogo: boolean;
  dotStyle?: DotStyle;
  markerCenterStyle?: MarkerCenterStyle;
  markerBorderStyle?: MarkerBorderStyle;
  markerColor?: string;
};

export type ImageSettings = {
  src: string;
  height: number;
  width: number;
  excavate: boolean;
  x?: number;
  y?: number;
};

export type QRProps = {
  value: string;
  size?: number;
  level?: string;
  bgColor?: string;
  fgColor?: string;
  margin?: number;
  style?: CSSProperties;
  imageSettings?: ImageSettings;
  isOGContext?: boolean;
  dotStyle?: DotStyle;
  markerCenterStyle?: MarkerCenterStyle;
  markerBorderStyle?: MarkerBorderStyle;
  markerColor?: string;
};
export type QRPropsCanvas = QRProps &
  React.CanvasHTMLAttributes<HTMLCanvasElement>;
export type QRPropsSVG = QRProps & React.SVGProps<SVGSVGElement>;
