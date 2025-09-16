import { cn } from "@dub/utils";
import { FC, useEffect, useState } from "react";
import Image from "next/image";
import ImageDemoPlaceholder from "./placeholders/image-demo-placeholder.webp";

interface QRCodeDemoImageProps {
  filesImage?: File[] | string;
  smallPreview?: boolean;
}

export const QRCodeDemoImage: FC<QRCodeDemoImageProps> = ({
  filesImage,
  smallPreview = false,
}) => {
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof filesImage === "string") {
      setImageObjectUrl(null);
      return;
    }

    const image = Array.isArray(filesImage) ? filesImage[0] : undefined;
    if (image) {
      const url = URL.createObjectURL(image);
      setImageObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setImageObjectUrl(null);
    }
  }, [filesImage]);

  const displayUrl =
      typeof filesImage === "string"
          ? filesImage
          : imageObjectUrl || ImageDemoPlaceholder;
  const hasContent = typeof filesImage === "string" || !!imageObjectUrl;
  const displayText = hasContent ? "Your Image" : "Your Image";

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
        fill="#004766"
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
          d="M15 75C15 67.268 21.268 61 29 61H241C248.732 61 255 67.268 255 75V352H15V75Z"
          fill="white"
          shapeRendering="crispEdges"
        />
        <foreignObject x="29" y="75" width="212" height="263">
          <Image
              src={displayUrl}
              alt="QR Code Demo"
              width={270}
              height={352}
              className="object-cover"
              unoptimized={!!displayUrl}
              priority
          />
        </foreignObject>
      </g>
    </svg>
  );
};