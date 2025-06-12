import { useSession } from "next-auth/react";
import QRCodeStyling from "qr-code-styling";
import { forwardRef, RefObject, useEffect, useRef } from "react";

interface QRCanvasProps {
  qrCode: QRCodeStyling | null;
  width?: number;
  height?: number;
}

export const QRCanvas = forwardRef<HTMLCanvasElement, QRCanvasProps>(
  ({ qrCode, width = 200, height = 200 }, ref) => {
    const { data: session } = useSession();
    const isAuthenticated = !!session;
    const internalCanvasRef = useRef<HTMLCanvasElement>(null);
    const svgContainerRef = useRef<HTMLDivElement>(null);

    const canvasRef =
      (ref as RefObject<HTMLCanvasElement>) || internalCanvasRef;

    useEffect(() => {
      if (!qrCode || !svgContainerRef.current || !canvasRef.current) return;

      svgContainerRef.current.replaceChildren();

      if (!isAuthenticated) {
        const baseUrl = window.location.origin;
        // process.env.NEXT_PUBLIC_APP_DOMAIN || window.location.origin;
        // const baseUrl = process.env.NEXT_PUBLIC_NGROK_URL; // for mobile local testing

        const tempQrCode = new QRCodeStyling({
          ...qrCode._options,
          data: `${baseUrl}/qr-complete-setup`,
        });
        tempQrCode.append(svgContainerRef.current);
      } else {
        qrCode.append(svgContainerRef.current);
      }

      svgContainerRef.current.style.display = "none";

      const renderSVGToCanvas = () => {
        const svg = svgContainerRef.current?.querySelector("svg");
        if (!svg || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

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
            ctx.drawImage(img, 0, 0, width, height);
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
    }, [qrCode, canvasRef, width, height, isAuthenticated]);

    return (
      <div className="flex flex-col gap-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="border-border-100 rounded-lg border bg-white p-1.5"
          />
          <div ref={svgContainerRef} />
        </div>
      </div>
    );
  },
);
