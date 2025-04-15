import { cn } from "@dub/utils";
import Image, { StaticImageData } from "next/image";

interface IStyleIconProps {
  src: StaticImageData;
  className?: string;
  size?: number;
}

export default function StyleIcon({
  src,
  className,
  size = 30,
}: IStyleIconProps) {
  return (
    <Image
      src={src}
      alt="QR Style"
      width={size}
      height={size}
      className={cn("object-contain", className)}
    />
  );
}
