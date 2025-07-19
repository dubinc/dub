import PdfDemoPlaceholder from "@/ui/qr-builder/components/qr-code-demos/demos/placeholders/pdf-demo-placeholder.webp";
import { cn } from "@dub/utils";
import dynamic from "next/dynamic";
import Image from "next/image";

const PdfViewer = dynamic(() => import("../pdf-viewer.tsx"), {
  ssr: false,
  loading: () => (
    <Image
      src={PdfDemoPlaceholder}
      alt="PDF Preview Placeholder"
      width={212}
      height={263}
      className="object-cover"
      priority
    />
  ),
});

interface IQRCodeDemoPdfProps {
  filesPDF?: File[] | string;
  smallPreview?: boolean;
}

export default function QRCodeDemoPdf({
  filesPDF,
  smallPreview = false,
}: IQRCodeDemoPdfProps) {
  const file = typeof filesPDF === "string" ? undefined : filesPDF?.[0];
  const url = typeof filesPDF === "string" ? filesPDF : undefined;

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
      <g>
        <path
          d="M15 75C15 67.268 21.268 61 29 61H241C248.732 61 255 67.268 255 75V352H15V75Z"
          fill="white"
          shapeRendering="crispEdges"
        />
        <g clipPath="url(#clip0_1608_2975)">
          <rect x="29" y="75" width="212" height="263" rx="12" fill="white" />
          <foreignObject x="29" y="75" width="212" height="263">
            <PdfViewer file={file} url={url} />
          </foreignObject>
        </g>
      </g>
    </svg>
  );
}
