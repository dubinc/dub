import Image, { StaticImageData } from "next/image";
import { FC } from "react";

interface IQrTabsImageProps {
  imgSrc: StaticImageData;
  width?: number;
  height?: number;
}
export const QrTabsDetailedImage: FC<IQrTabsImageProps> = ({
  imgSrc,
  width = 244,
  height = 163,
}) => {
  return (
    <Image
      className="absolute left-1/2 top-[60%] -translate-x-1/2 -translate-y-1/2 md:top-[55%]"
      src={imgSrc}
      width={width}
      height={height}
      alt="QR Code"
      priority
    />
  );
};
