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

import { IStyleOption } from "../../types/customization";

export const CORNER_SQUARE_STYLES: IStyleOption[] = [
  {
    id: "corner-square-square",
    type: "square",
    icon: SquareBorderIcon,
  },
  {
    id: "corner-square-rounded",
    type: "rounded",
    icon: RoundedBorderIcon,
  },
  {
    id: "corner-square-dot",
    type: "dot",
    icon: CircleBorderIcon,
  },
  {
    id: "corner-square-classy-rounded",
    type: "classy-rounded",
    icon: ClassyRoundedBorderIcon,
  },
];

export const CORNER_DOT_STYLES: IStyleOption[] = [
  {
    id: "corner-dot-square",
    type: "square",
    icon: SquareCenterIcon,
  },
  {
    id: "corner-dot-dot",
    type: "dot",
    icon: CircleCenterIcon,
  },
  {
    id: "corner-dot-dots",
    type: "dots",
    icon: DotsCenterIcon,
  },
  {
    id: "corner-dot-rounded",
    type: "rounded",
    icon: RoundedCenterIcon,
  },
  {
    id: "corner-dot-classy",
    type: "classy",
    icon: ClassyCenterIcon,
  },
];

export const DOT_STYLES: IStyleOption[] = [
  {
    id: "dots-square",
    type: "square",
    icon: DotsSquareIcon,
  },
  {
    id: "dots-dots",
    type: "dots",
    icon: DotsDotsIcon,
  },
  {
    id: "dots-rounded",
    type: "rounded",
    icon: DotsRoundedIcon,
  },
  {
    id: "dots-classy",
    type: "classy",
    icon: DotsClassyIcon,
  },
  {
    id: "dots-classy-rounded",
    type: "classy-rounded",
    icon: DotsClassyRoundedIcon,
  },
  {
    id: "dots-extra-rounded",
    type: "extra-rounded",
    icon: DotsExtraRoundedIcon,
  },
];
