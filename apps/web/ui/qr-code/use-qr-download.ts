import QRCodeStyling from "qr-code-styling";

export type TDownloadFormat = "svg" | "png" | "jpg";

// Helper function to detect device capabilities and calculate optimal canvas size
const getOptimalCanvasSize = () => {
  const pixelRatio = window.devicePixelRatio || 1;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  
  // Base size adapted for device capabilities
  // Mobile devices often have memory constraints, so we use a smaller base size
  let baseSize = isMobile ? 1536 : 2048;
  
  // Calculate optimal size considering pixel ratio
  // For high DPI devices (pixelRatio > 1), we need larger canvas to maintain quality
  // Cap at 4096 to prevent browser limitations and memory issues
  const optimalSize = Math.min(baseSize * pixelRatio, 4096);
  
  return {
    canvasSize: optimalSize,
    pixelRatio,
    isMobile,
  };
};

export const useQrDownload = (qrCode: QRCodeStyling | null) => {
  const downloadQrCode = async (format: TDownloadFormat) => {
    if (!qrCode) return;

    if (format === "svg") {
      qrCode.download({
        extension: "svg",
        name: "qr-code",
      });
    } else {
      const { canvasSize, pixelRatio, isMobile } = getOptimalCanvasSize();
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvasSize;
      tempCanvas.height = canvasSize;
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) return;

      // Enhanced smoothing settings for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const tempDiv = document.createElement("div");
      qrCode.append(tempDiv);
      const svg = tempDiv.querySelector("svg");
      if (!svg) {
        tempDiv.remove();
        return;
      }

      // Set SVG size to match canvas for better scaling
      // This ensures the SVG renders at the correct resolution for high DPI devices
      svg.setAttribute("width", canvasSize.toString());
      svg.setAttribute("height", canvasSize.toString());

      const img = new Image();
      img.onload = () => {
        try {
          // Fill background for JPG format
          if (format === "jpg") {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          }
          
          // Scale down from high-res canvas for better quality
          ctx.scale(1, 1); // Keep 1:1 scaling since we already sized canvas appropriately
          ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

          const link = document.createElement("a");
          const mimeType = format === "png" ? "image/png" : "image/jpeg";
          
          // Use maximum quality for better results
          const quality = 1.0;
          const dataUrl = tempCanvas.toDataURL(mimeType, quality);

          // Generate filename with device info for debugging
          const deviceInfo = isMobile ? "mobile" : "desktop";
          const fileName = `qr-code-${deviceInfo}-${pixelRatio}x.${format}`;
          
          link.href = dataUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (error) {
          console.error("Error generating QR code image:", error);
        } finally {
          tempDiv.remove();
          URL.revokeObjectURL(img.src);
        }
      };

      img.onerror = () => {
        console.error("Failed to load SVG for conversion");
        tempDiv.remove();
      };

      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);
      img.src = svgUrl;
    }
  };

  return { downloadQrCode };
};
