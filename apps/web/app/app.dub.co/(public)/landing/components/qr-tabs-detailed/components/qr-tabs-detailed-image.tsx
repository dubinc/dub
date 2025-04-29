import { cn } from "@dub/utils";
import Image, { StaticImageData } from "next/image";
import { FC } from "react";

interface IQrTabsImageProps {
  imgSrc: StaticImageData;
  width?: number;
  height?: number;
  className?: string;
}
export const QrTabsDetailedImage: FC<IQrTabsImageProps> = ({
  imgSrc,
  width = 244,
  height = 163,
  className,
}) => {
  return (
    <Image
      className={cn(
        "absolute left-1/2 top-[59%] -translate-x-1/2 -translate-y-1/2 md:top-[55%]",
        className,
      )}
      src={imgSrc}
      width={width}
      height={height}
      alt="QR Code"
      priority
    />
  );
};
