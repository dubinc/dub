import { cn } from "@dub/utils";
import { FC } from "react";

interface QRCodeDemoPDFProps {
  filesPDF?: File[] | string;
  smallPreview?: boolean;
}

export const QRCodeDemoPDF: FC<QRCodeDemoPDFProps> = ({
  filesPDF,
  smallPreview = false,
}) => {
  const hasContent = typeof filesPDF === "string";
  const displayText = hasContent ? "Your PDF" : "Place for Your PDF";

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
    >
      <path
        d="M0 22C0 9.84974 9.84974 0 22 0H248C260.15 0 270 9.84974 270 22V352H0V22Z"
        fill="white"
      />
      <path
        d="M0 21.9718C0 9.83713 9.83712 0 21.9718 0H248.028C260.163 0 270 9.83712 270 21.9718V207H0V21.9718Z"
        fill="#FFA000"
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
      <g filter="url(#filter0_d_1608_3275)">
        <path
          d="M15 75C15 67.268 21.268 61 29 61H241C248.732 61 255 67.268 255 75V352H15V75Z"
          fill="white"
          shapeRendering="crispEdges"
        />
        <rect x="29" y="75" width="212" height="263" rx="6" fill="#FEF2F2" />
      </g>
      <defs>
        <filter
          id="filter0_d_1608_3275"
          x="4"
          y="49"
          width="264"
          height="315"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feMorphology
            radius="2"
            operator="dilate"
            in="SourceAlpha"
            result="effect1_dropShadow_1608_3275"
          />
          <feOffset dx="1" />
          <feGaussianBlur stdDeviation="5" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_1608_3275"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_1608_3275"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
};