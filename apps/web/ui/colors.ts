import { ResourceColorsEnum } from "../lib/types";

export const RESOURCE_COLORS_DATA = [
  {
    color: "red",
    hex: "#FB2C36",
    tagVariants: "bg-red-100 text-red-600",
    groupVariants: "bg-red-500",
  },
  {
    color: "orange",
    hex: "#FF6900",
    tagVariants: "bg-orange-100 text-orange-600",
    groupVariants: "bg-orange-500",
  },
  {
    color: "amber",
    hex: "#FD9A00",
    tagVariants: "bg-amber-100 text-amber-600",
    groupVariants: "bg-amber-500",
  },
  {
    color: "yellow",
    hex: "#EFB100",
    tagVariants: "bg-yellow-100 text-yellow-600",
    groupVariants: "bg-yellow-500",
  },
  {
    color: "lime",
    hex: "#7CCF00",
    tagVariants: "bg-lime-100 text-lime-600",
    groupVariants: "bg-lime-500",
  },
  {
    color: "green",
    hex: "#00C951",
    tagVariants: "bg-green-100 text-green-600",
    groupVariants: "bg-green-500",
  },
  {
    color: "teal",
    hex: "#00BBA7",
    tagVariants: "bg-teal-100 text-teal-600",
    groupVariants: "bg-teal-500",
  },
  {
    color: "cyan",
    hex: "#00B8DB",
    tagVariants: "bg-cyan-100 text-cyan-600",
    groupVariants: "bg-cyan-500",
  },
  {
    color: "blue",
    hex: "#2B7FFF",
    tagVariants: "bg-blue-100 text-blue-600",
    groupVariants: "bg-blue-500",
  },
  {
    color: "indigo",
    hex: "#615FFF",
    tagVariants: "bg-indigo-100 text-indigo-600",
    groupVariants: "bg-indigo-500",
  },
  {
    color: "purple",
    hex: "#AD46FF",
    tagVariants: "bg-purple-100 text-purple-600",
    groupVariants: "bg-purple-500",
  },
  {
    color: "fuchsia",
    hex: "#E12AFB",
    tagVariants: "bg-fuchsia-100 text-fuchsia-600",
    groupVariants: "bg-fuchsia-500",
  },
  {
    color: "pink",
    hex: "#F6339A",
    tagVariants: "bg-pink-100 text-pink-600",
    groupVariants: "bg-pink-500",
  },
  {
    color: "brown",
    hex: "#CA8365",
    tagVariants: "bg-brown-100 text-brown-600",
    groupVariants: "bg-brown-500",
  },
  {
    color: "gray",
    hex: "#525252",
    tagVariants: "bg-gray-100 text-gray-600",
    groupVariants: "bg-gray-500",
  },
] as const;

export const RESOURCE_COLORS = RESOURCE_COLORS_DATA.map(
  (color) => color.color,
) as [string, ...string[]];

// Tags keep the original 7-color set from before the palette was extended to 15
export const TAG_COLORS = [
  "red",
  "yellow",
  "green",
  "blue",
  "purple",
  "brown",
  "gray",
] as const;

export const TAG_COLORS_DATA = RESOURCE_COLORS_DATA.filter(({ color }) =>
  (TAG_COLORS as readonly string[]).includes(color),
);

export const getResourceColorData = (color: ResourceColorsEnum) => {
  return RESOURCE_COLORS_DATA.find((c) => c.color === color);
};

export const RAINBOW_CONIC_GRADIENT =
  "conic-gradient(from 180deg at 50% 50%, #6AED9F 23.078deg, #97A1F7 72deg, #EF4BD5 144deg, #F94562 216deg, #FCAE6A 288deg, #ECDF59 339.603deg)";
