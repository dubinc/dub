import QRCodeStyling from "qr-code-styling";
import { useEffect, useRef } from "react";

interface QRCanvasProps {
  qrCode: QRCodeStyling | null;
  width?: number;
  height?: number;
}

export const QRCanvas = ({
  qrCode,
  width = 200,
  height = 200,
}: QRCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!qrCode || !svgContainerRef.current || !canvasRef.current) return;

    svgContainerRef.current.replaceChildren();
    qrCode.append(svgContainerRef.current);
    svgContainerRef.current.style.display = "none";

    const renderSVGToCanvas = () => {
      const svg = svgContainerRef.current?.querySelector("svg");
      if (!svg || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const img = new Image();

      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(img.src);
      };

      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);

      img.src = svgUrl;
    };

    const initialRenderTimeout = setTimeout(renderSVGToCanvas, 100);

    const observer = new MutationObserver(() => {
      setTimeout(renderSVGToCanvas, 50);
    });

    observer.observe(svgContainerRef.current, {
      subtree: true,
      childList: true,
      attributes: true,
    });

    return () => {
      clearTimeout(initialRenderTimeout);
      observer.disconnect();
      svgContainerRef.current?.replaceChildren();
    };
  }, [qrCode]);

  // @USEFUL_FEATURE: download new qr preview in canvas (for each format of png, jpg, svg)
  // const handleDownload = async () => {
  //   if (!qrCode) return;
  //
  //   if (exportFormat === "svg") {
  //     qrCode.download({
  //       extension: "svg",
  //       name: "qr-code",
  //     });
  //   } else {
  //     if (canvasRef.current) {
  //       const link = document.createElement("a");
  //
  //       const mimeType = exportFormat === "png" ? "image/png" : "image/jpeg";
  //       const quality = exportFormat === "jpeg" ? 0.9 : undefined;
  //
  //       const dataUrl = canvasRef.current.toDataURL(mimeType, quality);
  //
  //       link.href = dataUrl;
  //       link.download = `qr-code.${exportFormat}`;
  //
  //       document.body.appendChild(link);
  //       link.click();
  //       document.body.removeChild(link);
  //     }
  //   }
  // };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="border-border-100 rounded-lg border bg-white"
        />
        <div ref={svgContainerRef} />
      </div>
    </div>
  );
};
