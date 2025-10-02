import QRCodeStyling from "qr-code-styling";
import { useEffect, useRef, useState } from "react";

interface QRCanvasProps {
  qrCode: QRCodeStyling | null;
  width?: number;
  height?: number;
}

export const QRCanvas: React.FC<QRCanvasProps> = ({
  qrCode,
  width = 300,
  height = 300,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width, height });

  const maxSize = Math.min(containerSize.width, containerSize.height);
  const actualSize = Math.max(300, Math.min(maxSize - 32, 600));

  useEffect(() => {
    if (!canvasRef.current?.parentElement) return;

    let timeoutId: NodeJS.Timeout;
    const resizeObserver = new ResizeObserver((entries) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const entry = entries[0];
        if (entry?.contentRect) {
          const { width: newWidth, height: newHeight } = entry.contentRect;
          if (newWidth > 0 && newHeight > 0) {
            setContainerSize({
              width: newWidth,
              height: newHeight,
            });
          }
        }
      }, 100);
    });

    resizeObserver.observe(canvasRef.current.parentElement);

    // Set initial size
    const rect = canvasRef.current.parentElement.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setContainerSize({
        width: rect.width,
        height: rect.height,
      });
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!qrCode || !svgContainerRef.current || !canvasRef.current) return;

    let renderTimeout: NodeJS.Timeout;
    let mutationTimeout: NodeJS.Timeout;
    let isRendering = false;

    // Clear previous content
    svgContainerRef.current.replaceChildren();
    qrCode.append(svgContainerRef.current);
    svgContainerRef.current.style.display = "none";

    const renderSVGToCanvas = () => {
      if (isRendering) return; // Prevent concurrent renders

      const svg = svgContainerRef.current?.querySelector("svg");
      if (!svg || !canvasRef.current) return;

      isRendering = true;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        isRendering = false;
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      canvas.width = actualSize * dpr;
      canvas.height = actualSize * dpr;
      canvas.style.width = `${actualSize}px`;
      canvas.style.height = `${actualSize}px`;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      try {
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        const svgURL =
          "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);

        const img = new Image();
        img.onload = () => {
          if (!canvasRef.current) {
            isRendering = false;
            return;
          }
          ctx.save();
          ctx.scale(dpr, dpr);
          ctx.drawImage(img, 0, 0, actualSize, actualSize);
          ctx.restore();
          isRendering = false;
        };
        img.onerror = () => {
          console.error("Failed to load SVG image");
          isRendering = false;
        };
        img.src = svgURL;
      } catch (err) {
        console.error("SVG render failed:", err);
        isRendering = false;
      }
    };

    // Initial render with delay to ensure DOM is ready
    renderTimeout = setTimeout(renderSVGToCanvas, 200);

    // Watch for changes with throttled rendering
    const observer = new MutationObserver(() => {
      clearTimeout(mutationTimeout);
      mutationTimeout = setTimeout(renderSVGToCanvas, 150);
    });

    observer.observe(svgContainerRef.current, {
      subtree: true,
      childList: true,
      attributes: true,
    });

    return () => {
      clearTimeout(renderTimeout);
      clearTimeout(mutationTimeout);
      observer.disconnect();
      isRendering = false;
      svgContainerRef.current?.replaceChildren();
    };
  }, [qrCode, actualSize]);

  return (
    <>
      <canvas
        ref={canvasRef}
        width={actualSize}
        height={actualSize}
        className="border-border-100 max-h-full max-w-full rounded-lg border bg-white"
      />
      <div ref={svgContainerRef} style={{ display: "none" }} />
    </>
  );
};
