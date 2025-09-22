import { forwardRef, RefObject, useEffect, useRef, useState } from "react";
import QRCodeStyling from "qr-code-styling";

interface QRCanvasProps {
  qrCode: QRCodeStyling | null;
  width?: number;
  height?: number;
  className?: string;
}

export const QRCanvas = forwardRef<HTMLCanvasElement, QRCanvasProps>(
  ({ qrCode, width = 300, height = 300, className }, ref) => {
    const internalCanvasRef = useRef<HTMLCanvasElement>(null);
    const svgContainerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width, height });

    const canvasRef = (ref as RefObject<HTMLCanvasElement>) || internalCanvasRef;

    const maxSize = Math.min(containerSize.width, containerSize.width);
    const actualSize = Math.max(300, Math.min(maxSize - 32, 600));

    useEffect(() => {
      if (!containerRef.current) return;

      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry?.contentRect) {
          const { width: newWidth, height: newHeight } = entry.contentRect;
          setContainerSize({ 
            width: newWidth || width, 
            height: newHeight || height 
          });
        }
      });

      resizeObserver.observe(containerRef.current);

      // Set initial size based on container
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize({ 
          width: rect.width, 
          height: rect.height 
        });
      }

      return () => {
        resizeObserver.disconnect();
      };
    }, [width, height]);

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
        canvas.width = actualSize * dpr;
        canvas.height = actualSize * dpr;
        canvas.style.width = `${actualSize}px`;
        canvas.style.height = `${actualSize}px`;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        try {
          const serializer = new XMLSerializer();
          const svgString = serializer.serializeToString(svg);
          const svgURL = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);

          const img = new Image();
          img.onload = () => {
            ctx.save();
            ctx.scale(dpr, dpr);
            ctx.drawImage(img, 0, 0, actualSize, actualSize);
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
    }, [qrCode, canvasRef, actualSize]);

    return (
      <>
        <canvas
          ref={canvasRef}
          width={actualSize}
          height={actualSize}
          className="border-border-100 rounded-lg border bg-white max-w-full max-h-full"
        />
        <div ref={svgContainerRef} style={{ display: 'none' }} />
      </>
    );
  }
);

QRCanvas.displayName = "QRCanvas";