import QRCodeStyling from "qr-code-styling";

export type TDownloadFormat = "svg" | "png" | "jpg";

// Safari/WebKit canvas area limit (applies to iOS Safari AND iOS Chrome)
const WEBKIT_MAX_AREA = 16777216; // 4096 × 4096 (iOS Safari/Chrome limit)
const DESKTOP_MAX_AREA = 268435456; // ~16384 × 16384 (Desktop browsers)

// Simple and reliable browser/platform detection
const getPlatformLimits = () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // iOS devices (including Chrome on iOS) use WebKit with strict limits
  if (isIOS) {
    return { maxArea: WEBKIT_MAX_AREA, platform: 'ios' };
  }
  
  // Other mobile devices - use conservative limits
  if (isMobile) {
    return { maxArea: WEBKIT_MAX_AREA, platform: 'mobile' };
  }
  
  // Desktop - can handle larger canvas
  return { maxArea: DESKTOP_MAX_AREA, platform: 'desktop' };
};

// Function to calculate optimal canvas size with fallback
const getOptimalCanvasSize = (baseSize: number): number => {
  try {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const { maxArea } = getPlatformLimits();
    
    // Calculate ideal size considering pixel density
    const idealSize = Math.min(baseSize * devicePixelRatio, 8192); // Cap at 8192 for safety
    const idealArea = idealSize * idealSize;
    
    // If ideal size fits within platform limits, use it
    if (idealArea <= maxArea) {
      return idealSize;
    }
    
    // Calculate maximum possible size for the platform
    const maxSize = Math.floor(Math.sqrt(maxArea));
    
    // Ensure we never go below base size
    return Math.max(baseSize, maxSize);
  } catch (error) {
    console.warn('Error calculating canvas size, using fallback:', error);
    return baseSize; // Safe fallback
  }
};

export const useQrDownload = (qrCode: QRCodeStyling | null) => {
  const downloadQrCode = async (format: TDownloadFormat) => {
    if (!qrCode) return;

    if (format === "svg") {
      qrCode.download({
        extension: "svg",
        name: "qr-code",
      });
      return;
    }

    try {
      const baseCanvasSize = 2048;
      const canvasSize = getOptimalCanvasSize(baseCanvasSize);
      
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvasSize;
      tempCanvas.height = canvasSize;
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) {
        console.error('Failed to get canvas context');
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const tempDiv = document.createElement("div");
      qrCode.append(tempDiv);
      const svg = tempDiv.querySelector("svg");
      if (!svg) {
        tempDiv.remove();
        console.error('Failed to get SVG from QR code');
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          if (format === "jpg") {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          }
          ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

          const link = document.createElement("a");
          const mimeType = format === "png" ? "image/png" : "image/jpeg";
          const dataUrl = tempCanvas.toDataURL(mimeType, 1);

          link.href = dataUrl;
          link.download = `qr-code.${format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          tempDiv.remove();
          URL.revokeObjectURL(img.src);
        } catch (error) {
          console.error('Error during download:', error);
          tempDiv.remove();
          if (img.src.startsWith('blob:')) {
            URL.revokeObjectURL(img.src);
          }
        }
      };

      img.onerror = () => {
        console.error('Failed to load QR code image');
        tempDiv.remove();
        if (img.src.startsWith('blob:')) {
          URL.revokeObjectURL(img.src);
        }
      };

      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);
      img.src = svgUrl;
    } catch (error) {
      console.error('Error in downloadQrCode:', error);
    }
  };

  return { downloadQrCode };
};
