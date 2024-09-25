import { QRCodeSVG } from "@/lib/qr";
import { useMemo } from "react";

export function QRCode({
  url,
  fgColor,
  showLogo,
  logo,
  scale = 1,
}: {
  url: string;
  fgColor?: string;
  showLogo?: boolean;
  logo?: string;
  scale?: number;
}) {
  const qrData = useMemo(
    () => ({
      value: url,
      bgColor: "#ffffff",
      fgColor,
      size: 1024,
      level: "Q", // QR Code error correction level: https://blog.qrstuff.com/general/qr-code-error-correction
      includeMargin: false,
      ...(showLogo && {
        imageSettings: {
          src: logo || "https://assets.dub.co/logo.png",
          height: 256,
          width: 256,
          excavate: true,
        },
      }),
    }),
    [url, fgColor, showLogo, logo],
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
