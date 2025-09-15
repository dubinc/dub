import { cn } from "@dub/utils";
import { FC, useEffect, useState } from "react";

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

  const hasContent = typeof filesImage === "string";
  const displayText = hasContent ? "Your Image" : "Place for Your Image";

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
        <rect x="29" y="75" width="212" height="263" rx="6" fill="#F3F4F6" />
        
        {/* Image placeholder content */}
        <g transform="translate(100, 150)">
          {/* Mountains */}
          <path d="M10 50 L30 20 L50 40 L70 50 Z" fill="#D1D5DB" />
          <path d="M20 50 L40 25 L60 35 L70 50 Z" fill="#9CA3AF" />
          
          {/* Sun */}
          <circle cx="60" cy="30" r="8" fill="#FCD34D" />
          
          {/* Frame */}
          <rect x="0" y="10" width="70" height="50" rx="3" fill="none" stroke="#6B7280" strokeWidth="2" />
        </g>
      </g>
    </svg>
  );
};