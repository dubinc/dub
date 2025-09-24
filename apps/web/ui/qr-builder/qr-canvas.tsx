import QRCodeStyling from "qr-code-styling";
import { forwardRef, RefObject, useEffect, useRef, useState } from "react";

interface QRCanvasProps {
  qrCode: QRCodeStyling | null;
  width?: number;
  height?: number;
  maxWidth?: number;
  minWidth?: number;
}

export const QRCanvas = forwardRef<HTMLCanvasElement, QRCanvasProps>(
  ({ qrCode, width = 200, height = 200, maxWidth, minWidth = 100 }, ref) => {
    const internalCanvasRef = useRef<HTMLCanvasElement>(null);
    const svgContainerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [canvasSize, setCanvasSize] = useState({ width, height });

    const canvasRef =
      (ref as RefObject<HTMLCanvasElement>) || internalCanvasRef;

    useEffect(() => {
      if (!containerRef.current) return;

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const containerWidth = entry.contentRect.width;
          let newWidth = containerWidth;

          if (maxWidth && newWidth > maxWidth) {
            newWidth = maxWidth;
          }
          if (newWidth < minWidth) {
            newWidth = minWidth;
          }

          const newHeight = newWidth;

          setCanvasSize({ width: newWidth, height: newHeight });
        }
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }, [maxWidth, minWidth]);

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

        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvasSize.width * dpr;
        canvas.height = canvasSize.height * dpr;
        canvas.style.width = `${canvasSize.width}px`;
        canvas.style.height = `${canvasSize.height}px`;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        try {
          const serializer = new XMLSerializer();
          const svgString = serializer.serializeToString(svg);
          const svgURL =
            "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);

          const img = new Image();
          img.onload = () => {
            ctx.save();
            ctx.scale(dpr, dpr);
            ctx.drawImage(img, 0, 0, canvasSize.width, canvasSize.height);
            ctx.restore();
          };
          img.src = svgURL;
        } catch (err) {
          console.error("SVG render failed:", err);
        }
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
    }, [qrCode, canvasRef, canvasSize.width, canvasSize.height]);

    return (
      <div ref={containerRef} className="flex w-full flex-col gap-4">
        <div className="relative flex w-full justify-center">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="border-border-100 max-w-full rounded-lg border bg-white p-1.5"
          />
          <div ref={svgContainerRef} />
        </div>
      </div>
    );
  },
);
