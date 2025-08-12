import { ResourceColorsEnum } from "./types";

export const RESOURCE_COLORS_DATA = [
  {
    color: "red",
    css: "bg-red-100 text-red-600",
  },
  {
    color: "yellow",
    css: "bg-yellow-100 text-yellow-600",
  },
  {
    color: "green",
    css: "bg-green-100 text-green-600",
  },
  {
    color: "blue",
    css: "bg-blue-100 text-blue-600",
  },
  {
    color: "purple",
    css: "bg-purple-100 text-purple-600",
  },
  {
    color: "brown",
    css: "bg-brown-100 text-brown-600",
  },
];

export const RESOURCE_COLORS = RESOURCE_COLORS_DATA.map(
  (color) => color.color,
) as [string, ...string[]];

export const getResourceColorData = (color: ResourceColorsEnum) => {
  return RESOURCE_COLORS_DATA.find((c) => c.color === color);
};

export const RAINBOW_CONIC_GRADIENT =
  "conic-gradient(in hsl, #ee535d 0deg, #e9d988 90deg, #9fe0b8 180deg, #bf87e4 270deg, #ee535d 360deg)";
