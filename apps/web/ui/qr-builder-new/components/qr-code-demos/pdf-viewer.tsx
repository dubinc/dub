import Image from "next/image";
import PdfDemoPlaceholder from "./demos/placeholders/pdf-demo-placeholder.webp";
import { usePdfLoader } from "./hooks/use-pdf-loader";

interface PdfViewerProps {
  file?: File;
  url?: string;
}

export default function PdfViewer({ file, url }: PdfViewerProps) {
  const { imageDataUrl } = usePdfLoader({ file, url });

  return (
    <>
      {imageDataUrl ? (
        <Image
          src={imageDataUrl}
          alt="PDF Preview"
          width={212}
          height={263}
          className="object-contain"
          style={{
            display: "block",
            width: "100%",
            height: "100%",
          }}
          unoptimized
        />
      ) : (
        <Image
          src={PdfDemoPlaceholder}
          alt="PDF Preview Placeholder"
          width={212}
          height={263}
          className="object-cover"
          priority
        />
      )}
    </>
  );
}