import { StaticImageData } from "next/image";

export const isStaticImageData = (value: any): value is StaticImageData => {
  return (
    value &&
    typeof value === "object" &&
    "src" in value &&
    "height" in value &&
    "width" in value
  );
};
