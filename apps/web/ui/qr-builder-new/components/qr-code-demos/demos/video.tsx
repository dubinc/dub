import { cn } from "@dub/utils";
import Image from "next/image";
import { FC, useEffect, useState } from "react";
import { QR_DEMO_DEFAULTS } from "../../../constants/qr-type-inputs-placeholders";
import { generateVideoPreview } from "../../../helpers/generate-video-preview.ts";
import VideoDemoPlaceholder from "./placeholders/video-demo-placeholder.webp";

interface QRCodeDemoVideoProps {
  filesVideo?: File[] | string;
  smallPreview?: boolean;
}

export const QRCodeDemoVideo: FC<QRCodeDemoVideoProps> = ({
  filesVideo,
  smallPreview = false,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof filesVideo === "string") {
      generateVideoPreview(filesVideo, setPreviewUrl, undefined, false);
      return;
    }

    const file = Array.isArray(filesVideo) ? filesVideo[0] : undefined;
    if (!file || !file.type.startsWith("video/")) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    return generateVideoPreview(
      url,
      setPreviewUrl,
      () => URL.revokeObjectURL(url),
      true,
    );
  }, [filesVideo]);

  const imageToShow = previewUrl || VideoDemoPlaceholder;
  const hasContent = typeof filesVideo === "string" || !!previewUrl;
  const displayText = hasContent
    ? "Your Video"
    : QR_DEMO_DEFAULTS.VIDEO_PLACEHOLDER;

  return (
    <svg
      width="270"
      height="352"
      viewBox="0 0 270 352"
      className={cn("", {
        "h-[180px] w-[138px] lg:h-[209px] lg:w-[158px]": smallPreview,
      })}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <path
        d="M0 22C0 9.84974 9.84974 0 22 0H248C260.15 0 270 9.84974 270 22V352H0V22Z"
        fill="white"
      />
      <path
        d="M0 21.9718C0 9.83713 9.83712 0 21.9718 0H248.028C260.163 0 270 9.83712 270 21.9718V207H0V21.9718Z"
        fill="#11AB7C"
      />
      <text
        x="135"
        y="35"
        fill="#FFFFFF"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontFamily: "Inter, sans-serif",
          fontStyle: "normal",
          fontWeight: 600,
          fontSize: "16px",
          lineHeight: "20px",
          letterSpacing: "0.02em",
        }}
      >
        {displayText}
      </text>
      <g>
        <path
          d="M15 75C15 67.268 21.268 61 29 61H241C248.732 61 255 67.268 255 75V311H15V75Z"
          fill="white"
          shapeRendering="crispEdges"
        />
        <g clipPath="url(#clip0_1608_3245)">
          <foreignObject x="30" y="80" width="212" height="140">
            <Image
              src={imageToShow}
              width={212}
              height={140}
              alt="Preview"
              style={{
                objectFit: "contain",
                borderRadius: 12,
              }}
              unoptimized={!!previewUrl}
            />
          </foreignObject>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M135 164C138.152 164 141.273 163.379 144.184 162.173C147.096 160.967 149.742 159.199 151.971 156.971C154.199 154.742 155.967 152.096 157.173 149.184C158.379 146.273 159 143.152 159 140C159 136.848 158.379 133.727 157.173 130.816C155.967 127.904 154.199 125.258 151.971 123.029C149.742 120.801 147.096 119.033 144.184 117.827C141.273 116.621 138.152 116 135 116C128.635 116 122.53 118.529 118.029 123.029C113.529 127.53 111 133.635 111 140C111 146.365 113.529 152.47 118.029 156.971C122.53 161.471 128.635 164 135 164ZM131.755 129.307L146.805 137.669C147.221 137.9 147.567 138.238 147.808 138.648C148.049 139.058 148.176 139.525 148.176 140C148.176 140.475 148.049 140.942 147.808 141.352C147.567 141.762 147.221 142.1 146.805 142.331L131.755 150.693C131.267 150.964 130.718 151.103 130.16 151.096C129.603 151.089 129.057 150.937 128.576 150.654C128.096 150.371 127.698 149.967 127.421 149.483C127.145 148.999 126.999 148.451 127 147.893V132.107C126.999 131.549 127.145 131.001 127.421 130.517C127.698 130.033 128.096 129.629 128.576 129.346C129.057 129.063 129.603 128.911 130.16 128.904C130.718 128.897 131.267 129.036 131.755 129.307Z"
            fill="white"
          />
        </g>
        <defs>
          <clipPath id="clip0_1608_3245">
            <rect x="29" y="75" width="212" height="148" rx="6" fill="white" />
          </clipPath>
        </defs>
      </g>
    </svg>
  );
};
