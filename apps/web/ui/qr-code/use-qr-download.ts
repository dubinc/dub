import QRCodeStyling from "qr-code-styling";

export type TDownloadFormat = "svg" | "png" | "jpg";

// Browser-specific canvas area limits
const CANVAS_LIMITS = {
  SAFARI_MAX_AREA: 16777216, // 4096 × 4096 (iOS Safari limit)
  CHROME_MAX_AREA: 268435456, // ~16384 × 16384 (Chrome limit)
  FIREFOX_MAX_AREA: 472907776, // ~21800 × 21800 (Firefox limit) 
  IE_MAX_AREA: 67108864, // 8192 × 8192 (IE limit)
} as const;

// Detect browser type more accurately
const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  
  if (ua.includes('Safari') && !ua.includes('Chrome')) {
    return { name: 'safari', maxArea: CANVAS_LIMITS.SAFARI_MAX_AREA };
  }
  if (ua.includes('Chrome')) {
    return { name: 'chrome', maxArea: CANVAS_LIMITS.CHROME_MAX_AREA };
  }
  if (ua.includes('Firefox')) {
    return { name: 'firefox', maxArea: CANVAS_LIMITS.FIREFOX_MAX_AREA };
  }
  if (ua.includes('Trident') || ua.includes('MSIE')) {
    return { name: 'ie', maxArea: CANVAS_LIMITS.IE_MAX_AREA };
  }
  
  // Default to most restrictive for unknown browsers
  return { name: 'unknown', maxArea: CANVAS_LIMITS.SAFARI_MAX_AREA };
};

// Function to calculate optimal canvas size respecting browser limitations
const getOptimalCanvasSize = (baseSize: number): { size: number; quality: 'high' | 'medium' | 'limited' } => {
  const devicePixelRatio = window.devicePixelRatio || 1;
  const browser = getBrowserInfo();
  
  // Calculate ideal size considering pixel density
  const idealSize = baseSize * devicePixelRatio;
  const idealArea = idealSize * idealSize;
  
  // If ideal size fits within browser limits, use it
  if (idealArea <= browser.maxArea) {
    return { 
      size: idealSize, 
      quality: devicePixelRatio >= 2 ? 'high' : 'medium' 
    };
  }
  
  // Calculate maximum possible size for the browser
  const maxSize = Math.floor(Math.sqrt(browser.maxArea));
  
  // Try to find a good compromise - at least 1.5x the base size if possible
  const minimumAcceptableSize = baseSize * 1.5;
  const finalSize = Math.max(minimumAcceptableSize, Math.min(maxSize, idealSize));
  
  const quality = finalSize >= baseSize * 2 ? 'medium' : 'limited';
  
  if (finalSize < idealSize) {
    console.warn(
      `QR Code quality limited by ${browser.name} canvas constraints: ` +
      `requested ${idealSize}×${idealSize} (${idealArea.toLocaleString()} pixels), ` +
      `using ${finalSize}×${finalSize} (${(finalSize * finalSize).toLocaleString()} pixels)`
    );
  }
  
  return { size: finalSize, quality };
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
      const baseCanvasSize = 2048;
      const { size: canvasSize, quality } = getOptimalCanvasSize(baseCanvasSize);
      
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvasSize;
      tempCanvas.height = canvasSize;
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) return;

      // Optimize rendering settings based on quality level
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = quality === 'high' ? 'high' : 'medium';

      const tempDiv = document.createElement("div");
      qrCode.append(tempDiv);
      const svg = tempDiv.querySelector("svg");
      if (!svg) {
        tempDiv.remove();
        return;
      }

      const img = new Image();
      img.onload = () => {
        if (format === "jpg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        }
        ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

        const link = document.createElement("a");
        const mimeType = format === "png" ? "image/png" : "image/jpeg";
        // Use slightly lower quality for limited canvas sizes to reduce file size
        const canvasQuality = quality === 'limited' ? 0.9 : 1;
        const dataUrl = tempCanvas.toDataURL(mimeType, canvasQuality);

        link.href = dataUrl;
        link.download = `qr-code-${quality}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        tempDiv.remove();
        URL.revokeObjectURL(img.src);
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
