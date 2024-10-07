import { getQRData, QRCodeSVG } from "@/lib/qr";
import { useMemo } from "react";

export function QRCode({
  url,
  fgColor,
  hideLogo,
  logo,
  scale = 1,
}: {
  url: string;
  fgColor?: string;
  hideLogo?: boolean;
  logo?: string;
  scale?: number;
}) {
  const qrData = useMemo(
    () => getQRData({ url, fgColor, hideLogo, logo }),
    [url, fgColor, hideLogo, logo],
  );

  return (
    <QRCodeSVG
      value={qrData.value}
      size={(qrData.size / 8) * scale}
      bgColor={qrData.bgColor}
      fgColor={qrData.fgColor}
      level={qrData.level}
      includeMargin={false}
      {...(qrData.imageSettings && {
        imageSettings: {
          ...qrData.imageSettings,
          height: qrData.imageSettings
            ? (qrData.imageSettings.height / 8) * scale
            : 0,
          width: qrData.imageSettings
            ? (qrData.imageSettings.width / 8) * scale
            : 0,
        },
      })}
    />
  );
}
