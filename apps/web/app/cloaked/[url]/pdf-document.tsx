"use client";

import { useResizeObserver } from "@dub/ui";
import { useCallback, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure pdfjs worker for Next.js (using CDN to avoid module resolution issues)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const maxWidth = 800;

export function PDFDocument({ dataUrl }: { dataUrl: string }) {
  const [numPages, setNumPages] = useState<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeEntry = useResizeObserver(containerRef);
  const containerWidth = resizeEntry?.contentRect.width;

  // Memoize options to prevent unnecessary re-renders
  const options = useMemo(
    () => ({
      cMapUrl: "/cmaps/",
      standardFontDataUrl: "/standard_fonts/",
      wasmUrl: "/wasm/",
    }),
    [],
  );

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: nextNumPages }: { numPages: number }) => {
      setNumPages(nextNumPages);
    },
    [],
  );

  return (
    <div ref={containerRef} className="flex min-h-screen justify-center py-8">
      <div className="flex flex-col items-center">
        <Document
          file={dataUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          options={options}
        >
          {Array.from(new Array(numPages), (_el, index) => (
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              width={
                containerWidth ? Math.min(containerWidth, maxWidth) : maxWidth
              }
            />
          ))}
        </Document>
      </div>
    </div>
  );
}
