import QRCodeStyling from "qr-code-styling";

export type TDownloadFormat = "svg" | "png" | "jpg";

// Universal output settings - same for all devices
const UNIVERSAL_OUTPUT_SIZE = 2048; // Final image size for all devices
const UNIVERSAL_QUALITY = 0.95; // Consistent quality across devices

// Helper function to detect Chrome on iOS
const isChromeOnIOS = () => {
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isChrome = /CriOS/.test(userAgent); // Chrome on iOS uses CriOS
  return isIOS && isChrome;
};

// Helper function to get device-specific rendering settings (internal use only)
const getDeviceRenderingSettings = () => {
  const pixelRatio = window.devicePixelRatio || 1;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const isChromeIOS = isChromeOnIOS();

  // Internal rendering size - can vary by device capabilities
  let internalRenderSize: number;

  if (isChromeIOS) {
    // Chrome iOS: very conservative to avoid memory issues
    internalRenderSize = Math.min(1024 * pixelRatio, 2048);
  } else if (isMobile) {
    // Other mobile browsers: moderate size
    internalRenderSize = Math.min(1536 * pixelRatio, 3072);
  } else {
    // Desktop: can handle larger sizes
    internalRenderSize = Math.min(2048 * pixelRatio, 4096);
  }

  return {
    internalRenderSize,
    outputSize: UNIVERSAL_OUTPUT_SIZE,
    quality: UNIVERSAL_QUALITY,
    pixelRatio,
    isMobile,
    isChromeIOS,
    needsResize: internalRenderSize !== UNIVERSAL_OUTPUT_SIZE,
  };
};

// Helper function to resize canvas to universal output size
const resizeCanvasToUniversalSize = (
  sourceCanvas: HTMLCanvasElement,
  targetSize: number,
): HTMLCanvasElement => {
  if (sourceCanvas.width === targetSize && sourceCanvas.height === targetSize) {
    return sourceCanvas; // No resize needed
  }

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = targetSize;
  outputCanvas.height = targetSize;
  const outputCtx = outputCanvas.getContext("2d");

  if (!outputCtx) {
    throw new Error("Failed to create output canvas context");
  }

  // High-quality resize
  outputCtx.imageSmoothingEnabled = true;
  outputCtx.imageSmoothingQuality = "high";

  // Draw source canvas onto output canvas with resize
  outputCtx.drawImage(sourceCanvas, 0, 0, targetSize, targetSize);

  return outputCanvas;
};

// Helper function to clean up canvas to free memory (important for iOS)
const releaseCanvas = (canvas: HTMLCanvasElement) => {
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  ctx && ctx.clearRect(0, 0, 1, 1);
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
      const settings = getDeviceRenderingSettings();
      const renderCanvas = document.createElement("canvas");
      renderCanvas.width = settings.internalRenderSize;
      renderCanvas.height = settings.internalRenderSize;
      const ctx = renderCanvas.getContext("2d");

      if (!ctx) {
        console.error(
          "Failed to get canvas context - canvas memory limit may be exceeded",
        );
        return;
      }

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

      // Set SVG size to match render canvas for optimal quality
      svg.setAttribute("width", settings.internalRenderSize.toString());
      svg.setAttribute("height", settings.internalRenderSize.toString());

      const img = new Image();
      const mimeType = format === "png" ? "image/png" : "image/jpeg";

      img.onload = () => {
        let outputCanvas: HTMLCanvasElement | null = null;

        try {
          // Fill background for JPG format
          if (format === "jpg") {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
          }

          // Draw to render canvas
          ctx.drawImage(img, 0, 0, renderCanvas.width, renderCanvas.height);

          // Resize to universal output size if needed
          if (settings.needsResize) {
            outputCanvas = resizeCanvasToUniversalSize(
              renderCanvas,
              settings.outputSize,
            );
          } else {
            outputCanvas = renderCanvas;
          }

          // Generate download with universal settings
          const dataUrl = outputCanvas.toDataURL(mimeType, settings.quality);

          // Check if dataUrl is valid
          if (!dataUrl || dataUrl === "data:,") {
            throw new Error(
              "Canvas toDataURL failed - likely due to memory constraints",
            );
          }

          // Universal filename (no device-specific info in final version)
          const fileName = `qr-code-${settings.outputSize}px.${format}`;

          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (error) {
          console.error("Error generating QR code image:", error);

          // Fallback: try with much smaller size for Chrome iOS
          if (settings.isChromeIOS && settings.internalRenderSize > 1024) {
            console.log("Retrying with fallback size for Chrome iOS...");

            try {
              const fallbackCanvas = document.createElement("canvas");
              fallbackCanvas.width = 1024;
              fallbackCanvas.height = 1024;
              const fallbackCtx = fallbackCanvas.getContext("2d");

              if (fallbackCtx) {
                fallbackCtx.imageSmoothingEnabled = true;
                fallbackCtx.imageSmoothingQuality = "high";

                if (format === "jpg") {
                  fallbackCtx.fillStyle = "#ffffff";
                  fallbackCtx.fillRect(0, 0, 1024, 1024);
                }

                fallbackCtx.drawImage(img, 0, 0, 1024, 1024);

                // Always resize fallback to universal size
                const fallbackOutput = resizeCanvasToUniversalSize(
                  fallbackCanvas,
                  settings.outputSize,
                );
                const fallbackDataUrl = fallbackOutput.toDataURL(
                  mimeType,
                  settings.quality,
                );

                if (fallbackDataUrl && fallbackDataUrl !== "data:,") {
                  const fallbackLink = document.createElement("a");
                  fallbackLink.href = fallbackDataUrl;
                  fallbackLink.download = `qr-code-${settings.outputSize}px.${format}`;
                  document.body.appendChild(fallbackLink);
                  fallbackLink.click();
                  document.body.removeChild(fallbackLink);
                }

                // Clean up
                releaseCanvas(fallbackCanvas);
                fallbackCanvas.remove();
                if (fallbackOutput !== fallbackCanvas) {
                  releaseCanvas(fallbackOutput);
                  fallbackOutput.remove();
                }
              }
            } catch (fallbackError) {
              console.error("Fallback also failed:", fallbackError);
            }
          }
        } finally {
          tempDiv.remove();
          URL.revokeObjectURL(img.src);

          // Clean up canvases
          releaseCanvas(renderCanvas);
          if (outputCanvas && outputCanvas !== renderCanvas) {
            releaseCanvas(outputCanvas);
            outputCanvas.remove();
          }
        }
      };

      img.onerror = () => {
        console.error("Failed to load SVG for conversion");
        tempDiv.remove();
        releaseCanvas(renderCanvas);
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
