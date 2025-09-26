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
  className 
}) => {
  return (
    <Image
      src={src}
      alt="Style icon"
      width={size}
      height={size}
      className={cn("object-contain", className)}
    />
  );
};