import { cn } from "@dub/utils";
import Image, { StaticImageData } from "next/image";
import { FC } from "react";

interface StyleIconProps {
  src: StaticImageData;
  size?: number;
  className?: string;
}

export const StyleIcon: FC<StyleIconProps> = ({
  src,
  size = 40,
  className,
}) => {
  return (
    <Image
      src={src}
      alt="Style icon"
      width={size}
      height={size}
      quality={100}
      className={cn("object-contain transition-all", className)}
      style={{
        imageRendering: "crisp-edges",
        filter: className?.includes("brightness-0")
          ? "brightness(0)"
          : "contrast(3) brightness(0.8)",
      }}
    />
  );
};
