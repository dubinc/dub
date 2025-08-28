import PdfDemoPlaceholder from "@/ui/qr-builder/components/qr-code-demos/demos/placeholders/pdf-demo-placeholder.webp";
import Image from "next/image";
import { useEffect, useState } from "react";
import { pdfjs } from "react-pdf";
import workerSrc from "../../../../pdf-worker.js";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

interface PdfViewerSVGProps {
  file?: File;
  url?: string;
}

export default function PdfViewer({ file, url }: PdfViewerSVGProps) {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file && !url) {
      setImageDataUrl(null);
      return;
    }

    const loadPdf = async () => {
      try {
        let loadingTask;

        if (url) {
          loadingTask = pdfjs.getDocument(url);
        } else if (file) {
          const reader = new FileReader();

          reader.onload = async () => {
            const typedArray = new Uint8Array(reader.result as ArrayBuffer);
            const loadingTask = pdfjs.getDocument({ data: typedArray });

            await renderPdf(loadingTask);
          };

          reader.readAsArrayBuffer(file);
          return;
        }

        if (loadingTask) {
          await renderPdf(loadingTask);
        }
      } catch (err) {
        console.error("PDF load error:", err);
        setImageDataUrl(null);
      }
    };

    const renderPdf = async (loadingTask: any) => {
      try {
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;

        const dataUrl = canvas.toDataURL();
        setImageDataUrl(dataUrl);
      } catch (err) {
        console.error("PDF render error:", err);
        setImageDataUrl(null);
      }
    };

    loadPdf();
  }, [file, url]);

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
