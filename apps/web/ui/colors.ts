import { ResourceColorsEnum } from "../lib/types";

export const RESOURCE_COLORS_DATA = [
  {
    color: "red",
    tagVariants: "bg-red-100 text-red-600",
    groupVariants: "bg-red-600",
  },
  {
    color: "yellow",
    tagVariants: "bg-yellow-100 text-yellow-600",
    groupVariants: "bg-yellow-600",
  },
  {
    color: "green",
    tagVariants: "bg-green-100 text-green-600",
    groupVariants: "bg-green-600",
  },
  {
    color: "blue",
    tagVariants: "bg-blue-100 text-blue-600",
    groupVariants: "bg-blue-600",
  },
  {
    color: "purple",
    tagVariants: "bg-purple-100 text-purple-600",
    groupVariants: "bg-purple-600",
  },
  {
    color: "brown",
    tagVariants: "bg-brown-100 text-brown-600",
    groupVariants: "bg-brown-600",
  },
] as const;

export const RESOURCE_COLORS = RESOURCE_COLORS_DATA.map(
  (color) => color.color,
) as [string, ...string[]];

export const getResourceColorData = (color: ResourceColorsEnum) => {
  return RESOURCE_COLORS_DATA.find((c) => c.color === color);
};

export const RAINBOW_CONIC_GRADIENT =
  "conic-gradient(in hsl, #ee535d 0deg, #e9d988 90deg, #9fe0b8 180deg, #bf87e4 270deg, #ee535d 360deg)";
