import QrWebsiteImg from "@/ui/landing/assets/png/get-qr-website.png";
import Image from "next/image";
import { FC } from "react";

interface IQrTabsImageProps {
  width?: number;
}
export const QrTabsImage: FC<IQrTabsImageProps> = ({ width = 240 }) => {
  return (
    <Image
      src={QrWebsiteImg}
      width={width}
      height={240}
      alt="QR Code"
      priority
    />
  );
};
