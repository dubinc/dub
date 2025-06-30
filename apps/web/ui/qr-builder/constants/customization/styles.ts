import CircleBorderIcon from "@/ui/qr-builder/icons/border/circle.svg";
import ClassyRoundedBorderIcon from "@/ui/qr-builder/icons/border/classy-rounded.svg";
import RoundedBorderIcon from "@/ui/qr-builder/icons/border/rounded.svg";
import SquareBorderIcon from "@/ui/qr-builder/icons/border/square.svg";
import CircleCenterIcon from "@/ui/qr-builder/icons/center/circle.svg";
import ClassyCenterIcon from "@/ui/qr-builder/icons/center/classy.svg";
import DotsCenterIcon from "@/ui/qr-builder/icons/center/dots.svg";
import RoundedCenterIcon from "@/ui/qr-builder/icons/center/rounded.svg";
import SquareCenterIcon from "@/ui/qr-builder/icons/center/square.svg";
import DotsClassyRoundedIcon from "@/ui/qr-builder/icons/dots/classy-rounded.svg";
import DotsClassyIcon from "@/ui/qr-builder/icons/dots/classy.svg";
import DotsDotsIcon from "@/ui/qr-builder/icons/dots/dots.svg";
import DotsExtraRoundedIcon from "@/ui/qr-builder/icons/dots/extra-rounded.svg";
import DotsRoundedIcon from "@/ui/qr-builder/icons/dots/rounded.svg";
import DotsSquareIcon from "@/ui/qr-builder/icons/dots/square.svg";
import { StaticImageData } from "next/image";
import { CornerDotType, CornerSquareType } from "qr-code-styling";
import { DotType } from "qr-code-styling/lib/types";

export type TStyleOption = {
  id: string;
  icon: StaticImageData;
  type: CornerSquareType | CornerDotType | DotType | string;
  extension?: (
    svg: SVGSVGElement,
    options: {
      width: number;
      height: number;
      frameColor: string;
      frameText: string;
      frameTextColor: string;
    },
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
