import { StaticImageData } from "next/image";
import { CornerDotType, CornerSquareType } from "qr-code-styling";
import { DotType } from "qr-code-styling/lib/types";
import CircleBorderIcon from "../icons/border/circle.svg";
import ClassyRoundedBorderIcon from "../icons/border/classy-rounded.svg";
import RoundedBorderIcon from "../icons/border/rounded.svg";
import SquareBorderIcon from "../icons/border/square.svg";
import CircleCenterIcon from "../icons/center/circle.svg";
import ClassyCenterIcon from "../icons/center/classy.svg";
import DotsCenterIcon from "../icons/center/dots.svg";
import RoundedCenterIcon from "../icons/center/rounded.svg";
import SquareCenterIcon from "../icons/center/square.svg";
import DotsClassyRoundedIcon from "../icons/dots/classy-rounded.svg";
import DotsClassyIcon from "../icons/dots/classy.svg";
import DotsDotsIcon from "../icons/dots/dots.svg";
import DotsExtraRoundedIcon from "../icons/dots/extra-rounded.svg";
import DotsRoundedIcon from "../icons/dots/rounded.svg";
import DotsSquareIcon from "../icons/dots/square.svg";

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
  // {
  //   id: "border-extra-rounded",
  //   icon: ExtraRoundedBorderIcon,
  //   type: "extra-rounded",
  // },
  // { id: "border-classy", icon: CircleBorderIcon, type: "classy" },
  {
    id: "border-classy-rounded",
    icon: ClassyRoundedBorderIcon,
    type: "classy-rounded",
  },
];

export const CENTER_STYLES: TStyleOption[] = [
  { id: "center-square", icon: SquareCenterIcon, type: "square" },
  { id: "center-dot", icon: CircleCenterIcon, type: "dot" },
  { id: "center-dots", icon: DotsCenterIcon, type: "dots" },
  { id: "center-rounded", icon: RoundedCenterIcon, type: "rounded" },
  { id: "center-classy", icon: ClassyCenterIcon, type: "classy" },
  // {
  //   id: "center-classy-rounded",
  //   icon: CircleCenterIcon,
  //   type: "classy-rounded",
  // },
  // {
  //   id: "center-extra-rounded",
  //   icon: CircleCenterIcon,
  //   type: "extra-rounded",
  // },
];

export const DOTS_STYLES: TStyleOption[] = [
  {
    id: "dots-dots",
    icon: DotsDotsIcon,
    type: "dots",
  },
  {
    id: "dots-rounded",
    icon: DotsRoundedIcon,
    type: "rounded",
  },
  {
    id: "dots-classy",
    icon: DotsClassyIcon,
    type: "classy",
  },
  {
    id: "dots-classy-rounded",
    icon: DotsClassyRoundedIcon,
    type: "classy-rounded",
  },
  {
    id: "dots-square",
    icon: DotsSquareIcon,
    type: "square",
  },
  {
    id: "dots-extra-rounded",
    icon: DotsExtraRoundedIcon,
    type: "extra-rounded",
  },
];
