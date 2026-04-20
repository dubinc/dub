import { getQRData, QRCodeSVG } from "@/lib/qr";
import { DEFAULT_MARGIN } from "@/lib/qr/constants";
import { DotStyle, MarkerBorderStyle, MarkerCenterStyle } from "@/lib/qr/types";
import { memo, useMemo } from "react";

export const QRCode = memo(
  ({
    url,
    fgColor,
    hideLogo,
    logo,
    scale = 1,
    margin = DEFAULT_MARGIN,
    dotStyle,
    markerCenterStyle,
    markerBorderStyle,
    markerColor,
  }: {
    url: string;
    fgColor?: string;
    hideLogo?: boolean;
    logo?: string;
    scale?: number;
    margin?: number;
    dotStyle?: DotStyle;
    markerCenterStyle?: MarkerCenterStyle;
    markerBorderStyle?: MarkerBorderStyle;
    markerColor?: string;
  }) => {
    const qrData = useMemo(
      () =>
        getQRData({
          url,
          fgColor,
          hideLogo,
          logo,
          margin,
          dotStyle,
          markerCenterStyle,
          markerBorderStyle,
          markerColor,
        }),
      [
        url,
        fgColor,
        hideLogo,
        logo,
        margin,
        dotStyle,
        markerCenterStyle,
        markerBorderStyle,
        markerColor,
      ],
    );

    return (
      <QRCodeSVG
        value={qrData.value}
        size={(qrData.size / 8) * scale}
        bgColor={qrData.bgColor}
        fgColor={qrData.fgColor}
        level={qrData.level}
        margin={qrData.margin}
        dotStyle={qrData.dotStyle}
        markerCenterStyle={qrData.markerCenterStyle}
        markerBorderStyle={qrData.markerBorderStyle}
        markerColor={qrData.markerColor}
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
  },
);

QRCode.displayName = "QRCode";
