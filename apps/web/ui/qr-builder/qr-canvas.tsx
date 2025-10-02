import QRCodeStyling from "qr-code-styling";
import { forwardRef, RefObject, useEffect, useRef, useState } from "react";

interface QRCanvasProps {
  qrCode: QRCodeStyling | null;
  width?: number;
  height?: number;
  maxWidth?: number;
  minWidth?: number;
  onCanvasReady?: () => void;
}

export const QRCanvas = forwardRef<HTMLCanvasElement, QRCanvasProps>(
  ({ qrCode, width = 200, height = 200, maxWidth, minWidth = 100, onCanvasReady }, ref) => {
    const internalCanvasRef = useRef<HTMLCanvasElement>(null);
    const svgContainerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const initialSize = Math.max(width, height);
    const [canvasSize, setCanvasSize] = useState({
      width: initialSize,
      height: initialSize,
    });

    const canvasRef =
      (ref as RefObject<HTMLCanvasElement>) || internalCanvasRef;

    useEffect(() => {
      if (!containerRef.current) return;

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const containerWidth = entry.contentRect.width;
          let newSize = containerWidth;

          // Применяем ограничения для квадратного размера
          if (maxWidth && newSize > maxWidth) {
            newSize = maxWidth;
          }
          if (newSize < minWidth) {
            newSize = minWidth;
          }

          setCanvasSize({ width: newSize, height: newSize });
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

        if (!svg || !canvasRef.current) {
          console.log("Missing SVG or canvas, aborting");
          return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          console.log("Failed to get canvas context");
          return;
        }

        const pixelRatio = window.devicePixelRatio || 1;
        const isMobile = window.matchMedia("(max-width: 768px)").matches;

        let renderSize: number;
        if (canvasSize.width <= 100) {
          renderSize = Math.max(canvasSize.width * 3, 150);
        } else if (canvasSize.width <= 200) {
          renderSize = Math.max(canvasSize.width * 2, 200);
        } else {
          renderSize = Math.max(canvasSize.width * 1, 250);
        }

        const maxRenderSize = isMobile ? 2048 : 4096;
        renderSize = Math.min(renderSize, maxRenderSize);

        canvas.width = renderSize;
        canvas.height = renderSize;
        canvas.style.width = `${canvasSize.width}px`;
        canvas.style.height = `${canvasSize.height}px`;

        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        try {
          const serializer = new XMLSerializer();
          const svgString = serializer.serializeToString(svg);

          const svgURL =
            "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);

          const img = new Image();
          img.onload = () => {
            ctx.save();
            ctx.scale(
              renderSize / canvasSize.width,
              renderSize / canvasSize.height,
            );
            ctx.drawImage(img, 0, 0, canvasSize.width, canvasSize.height);
            ctx.restore();
            onCanvasReady?.();
          };
          img.onerror = (e) => {
            console.error("Failed to load QR image:", e);
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
            style={{
              width: `${canvasSize.width}px`,
              height: `${canvasSize.height}px`,
              aspectRatio: "1 / 1",
              objectFit: "contain",
              display: "block",
            }}
          />
          <div ref={svgContainerRef} />
        </div>
      </div>
    );
  },
);
